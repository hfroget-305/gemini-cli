/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Secret-redaction for tool-call telemetry. The CLI emits every tool
 * call's `function_args` to the configured OTLP backend, and those
 * args come from an LLM acting on a user prompt — they routinely
 * contain credentials (API keys, bearer tokens, DB URLs) that the
 * operator never intended to ship off-host.
 *
 * This redactor runs unconditionally before serialization. The
 * existing `getTelemetryLogPromptsEnabled()` flag controls whether
 * prompt *content* is exported; it is not a license to ship
 * credentials, so redaction applies in both cases.
 *
 * Three passes:
 *   1. Key-based: object keys whose tokenized form contains a
 *      secret-shaped name (`api_key`, `password`, `token`,
 *      `authorization`, `cookie`, etc.) have their value replaced
 *      with `[REDACTED]`. Tokenization splits on both
 *      `._-` separators and camelCase boundaries, so `apiKey`,
 *      `api_key`, `API-KEY`, and `openaiApiKey` are all caught.
 *   2. Sibling-aware HTTP-header pair: when an object has a
 *      `name`/`key`/`header` field whose value (case-insensitive)
 *      names a sensitive HTTP header (Authorization, Cookie,
 *      X-Api-Key, etc.), its companion `value` field is redacted.
 *      This catches the `[{name, value}]` header-list shape that
 *      generic HTTP MCP tools use.
 *   3. Value-based: any string value matching a known credential
 *      format — JWT, GitHub PAT, AWS access key, Stripe live key,
 *      Google API key, Slack token, OpenAI/Anthropic key, npm
 *      token, HTTP auth scheme prefix (`Bearer xxx`, `Basic xxx`),
 *      or a credentialed URL (`scheme://user:password@host`) — is
 *      replaced with `[REDACTED]`.
 *
 * The redactor is recursive, cycle-safe, and depth-limited. It does
 * NOT scan inside long free-form strings for embedded secrets —
 * that would require an entropy/regex sweep over every argument
 * and is out of scope for v1. Whole-string matches catch the
 * common case where the model passes a credential as its own
 * argument value.
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

/**
 * Individual secret-shaped tokens. A key whose tokenized form
 * contains any of these (case-insensitive) is treated as a secret.
 */
const SECRET_TOKENS: ReadonlySet<string> = new Set([
  'apikey',
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'credentials',
  'credential',
  'cookie',
  'cookies',
  'dsn',
]);

/**
 * Adjacent-token pairs that indicate a secret even when the
 * individual tokens are benign on their own. Stored as
 * "first+second" for cheap lookup.
 */
const SECRET_TOKEN_PAIRS: ReadonlySet<string> = new Set([
  'api+key',
  'access+token',
  'access+key',
  'secret+key',
  'client+secret',
  'private+key',
  'session+token',
  'refresh+token',
  'signing+key',
  'webhook+secret',
  'set+cookie',
  'connection+string',
  'database+url',
  'db+url',
  'db+password',
  'db+pass',
]);

/**
 * HTTP header names that carry credentials. Matched against the
 * companion `name`/`key`/`header` field in `{name, value}` pairs.
 * Lowercased for comparison.
 */
const SENSITIVE_HEADER_NAMES: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'www-authenticate',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-access-token',
  'x-amz-security-token',
]);

/**
 * Whole-string credential formats. Anchored on both ends so embedded
 * mentions in longer strings (e.g. error messages) don't trigger.
 */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  // JWT: three base64url segments joined by dots, header starts with "eyJ".
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  // GitHub classic PAT / OAuth / refresh / server-to-server / user-to-server.
  /^gh[pousr]_[A-Za-z0-9]{36,}$/,
  // GitHub fine-grained PAT.
  /^github_pat_[A-Za-z0-9_]{82,}$/,
  // AWS access key (and STS / session variants).
  /^(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASCA)[A-Z0-9]{16}$/,
  // Slack token (bot/user/refresh/app/admin/service).
  /^xox[abprse]-[A-Za-z0-9-]{10,}$/,
  // Stripe secret / publishable / restricted live or test keys.
  /^(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{20,}$/,
  // Google API key.
  /^AIza[0-9A-Za-z_-]{35}$/,
  // OpenAI API key (legacy and project-scoped).
  /^sk-(?:proj-)?[A-Za-z0-9_-]{20,}$/,
  // Anthropic API key.
  /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  // npm classic and granular tokens.
  /^npm_[A-Za-z0-9]{36}$/,
  // HTTP authentication schemes carrying opaque tokens — `Bearer xxx`,
  // `Basic xxx`. Bounded `\S+` so multi-word prose ("Bearer of bad news")
  // doesn't trip it. `Digest` etc. have whitespace inside the credential
  // portion; the sibling-aware {name: 'Authorization', value} pass and
  // key-based pass catch those.
  /^(?:Bearer|Basic)\s+\S+$/i,
  // Credentialed URLs: `scheme://user:password@host[/...]`. Requires the
  // `userinfo:password@` form; benign URLs without embedded creds skip.
  /^[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@\S+$/i,
];

/**
 * Return a structural copy of `input` with secret-shaped keys and
 * known credential values replaced by `[REDACTED]`. Non-object
 * inputs are returned as-is (after value-level redaction for
 * strings).
 *
 * Safe for arbitrary JSON-shaped data: handles arrays, nested
 * objects, cycles, and depth blow-ups.
 */
export function redactSensitiveArgs(input: unknown): unknown {
  return walk(input, 0, new WeakSet());
}

function walk(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED:depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[TRUNCATED:cycle]';
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => walk(v, depth + 1, seen));
  }

  const obj = value as Record<string, unknown>;
  // Sibling-aware HTTP header pair: `{name|key|header: 'Authorization', value: 'Bearer x'}`.
  const headerValueKey = findSensitiveHeaderValueKey(obj);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === headerValueKey) {
      out[k] = REDACTED;
    } else if (isSecretKey(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = walk(v, depth + 1, seen);
    }
  }
  return out;
}

/**
 * Split a key on non-alphanumeric characters and camelCase
 * boundaries, lowercase everything, and return the resulting
 * tokens. Used to detect secret-shaped names regardless of casing
 * convention.
 *
 * Examples:
 *   apiKey            -> ['api', 'key']
 *   api_key           -> ['api', 'key']
 *   API-KEY           -> ['api', 'key']
 *   openaiApiKey      -> ['openai', 'api', 'key']
 *   awsSecretAccessKey-> ['aws', 'secret', 'access', 'key']
 *   tokenizer         -> ['tokenizer']
 *   passphrase_hint   -> ['passphrase', 'hint']
 */
function tokenizeKey(key: string): string[] {
  if (!key) return [];
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isSecretKey(key: string): boolean {
  const tokens = tokenizeKey(key);
  if (tokens.length === 0) return false;
  for (const t of tokens) {
    if (SECRET_TOKENS.has(t)) return true;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    if (SECRET_TOKEN_PAIRS.has(`${tokens[i]}+${tokens[i + 1]}`)) {
      return true;
    }
  }
  return false;
}

/**
 * If `obj` looks like an HTTP header pair (`{name|key|header, value}`)
 * whose name matches a sensitive header, return the property key
 * that holds the value to redact. Otherwise return null.
 *
 * Only triggers on objects with exactly the header-pair shape so
 * we don't accidentally redact a sibling `value` field in unrelated
 * structures.
 */
function findSensitiveHeaderValueKey(
  obj: Record<string, unknown>,
): string | null {
  // Look for a candidate name field.
  const nameKeys = ['name', 'key', 'header'];
  for (const nameKey of nameKeys) {
    const nameValue = obj[nameKey];
    if (typeof nameValue !== 'string') continue;
    const lowered = nameValue.toLowerCase();
    if (!SENSITIVE_HEADER_NAMES.has(lowered)) continue;
    // Pair the name with a sibling value field.
    for (const valueKey of ['value', 'val']) {
      if (valueKey in obj) return valueKey;
    }
  }
  return null;
}

function redactString(s: string): string {
  for (const re of SECRET_VALUE_PATTERNS) {
    if (re.test(s)) return REDACTED;
  }
  return s;
}
