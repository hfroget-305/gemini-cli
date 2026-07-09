/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { redactSensitiveArgs } from './redact.js';

const REDACTED = '[REDACTED]';

describe('redactSensitiveArgs', () => {
  describe('key-based redaction', () => {
    it.each([
      ['api_key', 'sk-something'],
      ['apiKey', 'whatever'],
      ['API_KEY', 'AKIAIOSFODNN7EXAMPLE'],
      ['password', 'hunter2'],
      ['Password', 'hunter2'],
      ['passwd', 'x'],
      ['pwd', 'x'],
      ['authorization', 'Bearer xyz'],
      ['Authorization', 'Bearer xyz'],
      ['auth', 'xyz'],
      ['bearer', 'xyz'],
      ['secret', 'xyz'],
      ['client_secret', 'xyz'],
      ['secret_key', 'xyz'],
      ['credentials', 'xyz'],
      ['credential', 'xyz'],
      ['private_key', '-----BEGIN-----'],
      ['privateKey', '-----BEGIN-----'],
      ['session_token', 'xyz'],
      ['refresh_token', 'xyz'],
      ['access_token', 'xyz'],
      ['access_key', 'xyz'],
      ['signing_key', 'xyz'],
      ['webhook_secret', 'xyz'],
      ['x_api_key', 'xyz'],
      ['x-api-key', 'xyz'],
      ['X-API-KEY', 'xyz'],
      ['token', 'xyz'],
      ['cookie', 'sessionid=abc'],
      ['Cookie', 'sessionid=abc'],
      ['set-cookie', 'sessionid=abc'],
      ['Set-Cookie', 'sessionid=abc'],
      ['dsn', 'postgres://u:p@host/db'],
      ['DSN', 'postgres://u:p@host/db'],
      ['database_url', 'postgres://u:p@host/db'],
      ['db_url', 'postgres://u:p@host/db'],
      ['connection_string', 'Server=...'],
    ])('redacts value for key %s', (key, value) => {
      const out = redactSensitiveArgs({ [key]: value }) as Record<
        string,
        unknown
      >;
      expect(out[key]).toBe(REDACTED);
    });

    it.each([
      'openaiApiKey',
      'googleApiKey',
      'githubToken',
      'awsSecretAccessKey',
      'dbPassword',
      'stripeSecretKey',
      'slackBotToken',
      'mySessionToken',
      'firebaseAuthToken',
      'csrfToken',
    ])('redacts prefixed camelCase secret key %s', (key) => {
      const out = redactSensitiveArgs({ [key]: 'opaque-value' }) as Record<
        string,
        unknown
      >;
      expect(out[key]).toBe(REDACTED);
    });

    it.each([
      'tokenizer',
      'passphrase_hint',
      'authority_name',
      'user_id',
      'message',
      'file_path',
      'command',
      'userId',
      'authorityName',
    ])('does not redact for benign key %s', (key) => {
      const out = redactSensitiveArgs({ [key]: 'plain value' }) as Record<
        string,
        unknown
      >;
      expect(out[key]).toBe('plain value');
    });

    it('redacts nested under a non-secret parent', () => {
      const out = redactSensitiveArgs({
        config: { auth: { token: 'literal-secret' } },
      }) as { config: { auth: unknown } };
      // The whole `auth` value is redacted because the key matches.
      expect(out.config.auth).toBe(REDACTED);
    });

    it('redacts inside arrays of objects by key match', () => {
      const out = redactSensitiveArgs({
        items: [
          { name: 'Content-Type', api_key: 'leak' },
          { name: 'OK', other: 'fine' },
        ],
      }) as { items: Array<Record<string, unknown>> };
      expect(out.items[0]['api_key']).toBe(REDACTED);
      expect(out.items[1]['other']).toBe('fine');
    });
  });

  describe('sibling-aware HTTP header redaction', () => {
    it.each([
      'Authorization',
      'authorization',
      'Cookie',
      'cookie',
      'Set-Cookie',
      'set-cookie',
      'X-Api-Key',
      'x-api-key',
      'Proxy-Authorization',
      'X-Auth-Token',
      'X-Csrf-Token',
      'X-Amz-Security-Token',
    ])('redacts {name: %s, value: ...} value', (name) => {
      const out = redactSensitiveArgs({
        headers: [{ name, value: 'opaque-credential' }],
      }) as { headers: Array<Record<string, unknown>> };
      expect(out.headers[0]['value']).toBe(REDACTED);
      // Name is preserved (it's the header name, not the secret).
      expect(out.headers[0]['name']).toBe(name);
    });

    it('redacts {key: Cookie, value: ...} variant', () => {
      const out = redactSensitiveArgs({
        headers: [{ key: 'Cookie', value: 'sessionid=abc; csrf=def' }],
      }) as { headers: Array<Record<string, unknown>> };
      expect(out.headers[0]['value']).toBe(REDACTED);
    });

    it('redacts {header: Authorization, value: ...} variant', () => {
      const out = redactSensitiveArgs({
        headers: [{ header: 'Authorization', value: 'Bearer xyz' }],
      }) as { headers: Array<Record<string, unknown>> };
      expect(out.headers[0]['value']).toBe(REDACTED);
    });

    it('does NOT redact value when name is a benign header', () => {
      const out = redactSensitiveArgs({
        headers: [{ name: 'Content-Type', value: 'application/json' }],
      }) as { headers: Array<Record<string, unknown>> };
      expect(out.headers[0]['value']).toBe('application/json');
    });

    it('does NOT redact a stray `value` field outside the header-pair shape', () => {
      const out = redactSensitiveArgs({
        setting: { value: 'plain-config-value' },
      }) as { setting: Record<string, unknown> };
      expect(out.setting['value']).toBe('plain-config-value');
    });
  });

  describe('value-based redaction', () => {
    it.each([
      ['jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc-DEF_123'],
      ['github classic pat', 'ghp_' + 'a'.repeat(36)],
      ['github oauth', 'gho_' + 'a'.repeat(36)],
      ['github server-to-server', 'ghs_' + 'a'.repeat(36)],
      ['github user-to-server', 'ghu_' + 'a'.repeat(36)],
      ['github refresh', 'ghr_' + 'a'.repeat(36)],
      ['github fine-grained pat', 'github_pat_' + 'A'.repeat(82)],
      ['aws access key', 'AKIAIOSFODNN7EXAMPLE'],
      ['aws sts session', 'ASIAIOSFODNN7EXAMPLE'],
      ['slack bot', 'xoxb-1234567890-abcdefghij'],
      ['slack user', 'xoxp-1234567890-abcdefghij'],
      ['stripe secret live', 'sk_live_' + 'a'.repeat(24)],
      ['stripe publishable live', 'pk_live_' + 'a'.repeat(24)],
      ['stripe restricted test', 'rk_test_' + 'a'.repeat(24)],
      ['google api key', 'AIza' + 'a'.repeat(35)],
      ['openai', 'sk-' + 'a'.repeat(48)],
      ['openai project', 'sk-proj-' + 'a'.repeat(48)],
      ['anthropic', 'sk-ant-' + 'a'.repeat(40)],
      ['npm token', 'npm_' + 'a'.repeat(36)],
      ['http bearer', 'Bearer eyJhbGciOi.foo.bar'],
      ['http basic', 'Basic dXNlcjpwYXNz'],
      ['credentialed postgres url', 'postgres://user:pass@host:5432/db'],
      ['credentialed mysql url', 'mysql://root:hunter2@127.0.0.1/app'],
      ['credentialed mongodb srv', 'mongodb+srv://u:p@cluster.example.com/db'],
      ['credentialed https url', 'https://user:s3cr3t@example.com/path'],
      ['credentialed redis url', 'redis://default:pw@redis.local:6379/0'],
    ])('redacts %s value under a benign key', (_, value) => {
      const out = redactSensitiveArgs({ message: value }) as Record<
        string,
        unknown
      >;
      expect(out['message']).toBe(REDACTED);
    });

    it.each([
      'hello world',
      'https://example.com/path?q=1',
      'gh_short', // shorter than the github pat min length
      'sk-short', // too short for openai-style
      'AKIA_too_short',
      'arbitrary base64 looking data SGVsbG8gd29ybGQ=',
      'embedded ghp_ABCDEFGHIJ in a longer error message', // not whole-string
      'https://user@example.com', // userinfo without password
      'https://example.com/api?password=hidden', // no userinfo:pw@ shape
      'I will use Bearer tokens for auth', // not the Bearer-prefix shape
    ])('does not redact benign value %s', (value) => {
      const out = redactSensitiveArgs({ message: value }) as Record<
        string,
        unknown
      >;
      expect(out['message']).toBe(value);
    });
  });

  describe('structural handling', () => {
    it('passes through non-string primitives', () => {
      const out = redactSensitiveArgs({
        count: 42,
        enabled: true,
        ratio: 0.5,
        nothing: null,
      });
      expect(out).toEqual({
        count: 42,
        enabled: true,
        ratio: 0.5,
        nothing: null,
      });
    });

    it('preserves undefined', () => {
      const out = redactSensitiveArgs({ x: undefined }) as Record<
        string,
        unknown
      >;
      expect(out['x']).toBeUndefined();
    });

    it('handles cycles without throwing', () => {
      const a: Record<string, unknown> = { name: 'root' };
      a['self'] = a;
      const out = redactSensitiveArgs(a) as Record<string, unknown>;
      expect(out['name']).toBe('root');
      expect(out['self']).toBe('[TRUNCATED:cycle]');
    });

    it('truncates beyond max depth', () => {
      // Build an 11-deep nested object — the leaf should be replaced.
      let nested: Record<string, unknown> = { leaf: 'value' };
      for (let i = 0; i < 11; i++) {
        nested = { next: nested };
      }
      const out = redactSensitiveArgs(nested);
      // Walk down to verify a depth marker eventually appears.
      let cursor: unknown = out;
      let found = false;
      for (let i = 0; i < 20 && cursor && typeof cursor === 'object'; i++) {
        const obj = cursor as Record<string, unknown>;
        if (obj['next'] === '[TRUNCATED:depth]') {
          found = true;
          break;
        }
        cursor = obj['next'] ?? obj['leaf'];
      }
      expect(found).toBe(true);
    });

    it('redacts top-level string secret', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123';
      expect(redactSensitiveArgs(jwt)).toBe(REDACTED);
    });

    it('returns null/undefined unchanged', () => {
      expect(redactSensitiveArgs(null)).toBeNull();
      expect(redactSensitiveArgs(undefined)).toBeUndefined();
    });

    it('redacts inside arrays where the value itself is a secret string', () => {
      const out = redactSensitiveArgs([
        'plain',
        'ghp_' + 'a'.repeat(36),
        { ok: 'value', token: 'leak' },
      ]) as unknown[];
      expect(out[0]).toBe('plain');
      expect(out[1]).toBe(REDACTED);
      expect((out[2] as Record<string, unknown>)['token']).toBe(REDACTED);
    });
  });
});
