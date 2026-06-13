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
    ])('redacts value for key %s', (key, value) => {
      const out = redactSensitiveArgs({ [key]: value }) as Record<
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

    it('redacts inside arrays of objects', () => {
      const out = redactSensitiveArgs({
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Api-Key', api_key: 'leak' },
        ],
      }) as { headers: Array<Record<string, unknown>> };
      expect(out.headers[0]['value']).toBe('application/json');
      expect(out.headers[1]['api_key']).toBe(REDACTED);
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
