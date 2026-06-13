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
 * Two passes:
 *   1. Key-based: any object key matching a secret-shaped name
 *      (`api_key`, `password`, `authorization`, etc.) has its value
 *      replaced with `[REDACTED]`, regardless of value shape.
 *   2. Value-based: any string value matching a known credential
 *      format (JWT, GitHub PAT, AWS access key, Stripe live key,
 *      Google API key, Slack token, OpenAI/Anthropic key, npm
 *      token) is replaced with `[REDACTED]`.
 *
 * The redactor is recursive, cycle-safe, and depth-limited. It does
 * NOT scan inside long free-form strings for embedded secrets — that
 * would require an entropy/regex sweep over every argument and is
 * out of scope for v1. Whole-string matches catch the common case
 * where the model passes a credential as its own argument value.
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

/**
 * Case-insensitive match for object keys whose value is treated as
 * a credential by convention. The pattern requires the secret word
 * to appear as a whole token (either the entire key, or delimited
 * by `_`, `-`, or `.`) so we don't false-positive on names like
 * `tokenizer` or `passphrase_hint`.
 */
const SECRET_KEY_PATTERN =
  /(?:^|[._-])(?:api[_-]?key|apikey|access[_-]?token|access[_-]?key|secret(?:[_-]?key)?|client[_-]?secret|auth(?:orization)?|bearer|password|passwd|pwd|credentials?|private[_-]?key|session[_-]?token|refresh[_-]?token|signing[_-]?key|webhook[_-]?secret|x[_-]?api[_-]?key|token)(?:$|[._-])/i;

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
  // Slack token (bot/user/refresh/app/admin).
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

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = walk(v, depth + 1, seen);
    }
  }
  return out;
}

function redactString(s: string): string {
  for (const re of SECRET_VALUE_PATTERNS) {
    if (re.test(s)) return REDACTED;
  }
  return s;
}
