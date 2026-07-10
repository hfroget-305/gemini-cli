/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hygiene for text that MCP servers control and that flows into two
 * sensitive places: the model's function declarations (tool and
 * parameter descriptions) and the user's terminal (tool confirmation
 * dialogs). A malicious or compromised server can abuse either — by
 * embedding instructions the model treats as authoritative, by hiding
 * those instructions from human review with invisible Unicode, or by
 * spoofing the confirmation UI with terminal escape sequences.
 *
 * This module does NOT try to detect prompt injection semantically —
 * flagging "suspicious" prose is guesswork. It removes the mechanical
 * tricks that make injection invisible or UI-spoofing possible:
 *
 *   - ANSI/VT escape sequences (CSI, OSC, and stray ESC): terminal
 *     spoofing in confirmation dialogs — cursor movement, line
 *     rewriting, fake "trusted" banners.
 *   - C0/C1 control characters other than \n and \t: same category
 *     (e.g. \r for line rewriting, \x08 backspace overprinting).
 *   - Invisible/formatting Unicode: zero-width characters, bidi
 *     overrides, and the deprecated TAG block (U+E0000–E007F, which
 *     encodes an invisible ASCII side channel). These hide text from
 *     a human reviewer while remaining fully visible to the model.
 *   - Unbounded length: a multi-hundred-KB description is a context
 *     flooding vector; cap it — per string and in aggregate across a
 *     schema.
 *
 * Legitimate descriptions — including non-Latin scripts, emoji, and
 * markdown — pass through unchanged.
 */

/** Maximum characters kept from a single description string. */
export const MAX_DESCRIPTION_LENGTH = 16_384;

/**
 * Shared budget for all annotation strings across one schema. A
 * server cannot flood the context by spreading near-cap descriptions
 * over many properties: once the aggregate is spent, further
 * annotation strings are dropped.
 */
export const MAX_SCHEMA_ANNOTATION_BUDGET = 65_536;

const TRUNCATION_MARKER = '\n…[description truncated]';
const DEPTH_MARKER = '[omitted: schema exceeds maximum depth]';
const CYCLE_MARKER = '[omitted: cyclic schema]';
const BUDGET_MARKER = '[omitted: schema annotation budget exhausted]';

// ESC-initiated sequences: CSI (ESC [ ... final byte), OSC (ESC ]
// ... BEL or ST), and any remaining lone ESC + byte. Also matches the
// C1 single-byte CSI/OSC forms.
const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\x1b\[[0-?]*[ -/]*[@-~]|\x9b[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x9d[^\x07]*\x07?|\x1b[@-Z\\^_]/g;

// C0 controls except \t (09) and \n (0a); DEL; C1 controls.
// eslint-disable-next-line no-control-regex
const CONTROL_PATTERN = /[\x00-\x08\x0b-\x1f\x7f\x80-\x9f]/g;

// Invisible and direction-override characters:
//   200B–200D zero-width space/non-joiner/joiner, 2060 word joiner,
//   FEFF zero-width no-break space, 00AD soft hyphen,
//   202A–202E bidi embedding/override, 2066–2069 bidi isolates,
//   061C Arabic letter mark, 180E Mongolian vowel separator,
//   E0000–E007F tags block (invisible ASCII channel).
const INVISIBLE_PATTERN =
  /[\u200b-\u200d\u2060\ufeff\u00ad\u202a-\u202e\u2066-\u2069\u061c\u180e]|\udb40[\udc00-\udc7f]/g;

// Schema keys whose string values are annotations shown to the model
// (or a human) rather than data — these get sanitized.
const ANNOTATION_KEYS = new Set([
  'description',
  'title',
  '$comment',
  'markdownDescription',
]);

// Schema keys whose values are DATA (compared against arguments or
// echoed back as defaults), not annotations. Rewriting these would
// change validation semantics, so they are copied verbatim and not
// recursed into.
const DATA_VALUE_KEYS = new Set(['enum', 'const', 'default', 'examples']);

/**
 * Sanitize a single server-supplied description string. Returns ''
 * for null/undefined input.
 */
export function sanitizeMcpDescription(text: string | undefined): string {
  if (!text) return '';
  let out = text
    .replace(ANSI_PATTERN, '')
    .replace(CONTROL_PATTERN, '')
    .replace(INVISIBLE_PATTERN, '');
  if (out.length > MAX_DESCRIPTION_LENGTH) {
    out = out.slice(0, MAX_DESCRIPTION_LENGTH) + TRUNCATION_MARKER;
  }
  return out;
}

/**
 * Return a copy of a JSON-schema-shaped object with every annotation
 * string (`description`, `title`, `$comment`, `markdownDescription`)
 * sanitized, recursively. Parameter schemas reach the model the same
 * way tool descriptions do, so they are the same injection surface.
 *
 * Data-valued keywords (`enum`, `const`, `default`, `examples`) are
 * copied verbatim — rewriting them would change validation semantics.
 *
 * Fail-closed structural guards: subtrees beyond the depth limit and
 * cyclic references are REPLACED with an inert marker string, never
 * forwarded unsanitized. Annotation strings share an aggregate
 * budget ({@link MAX_SCHEMA_ANNOTATION_BUDGET}); once spent, further
 * annotations are dropped.
 */
export function sanitizeSchemaDescriptions<T>(schema: T): T {
  const budget = { remaining: MAX_SCHEMA_ANNOTATION_BUDGET };
  return walkSchema(schema, 0, new WeakSet(), budget) as T;
}

const MAX_SCHEMA_DEPTH = 32;

function sanitizeAnnotation(
  value: string,
  budget: { remaining: number },
): string {
  if (budget.remaining <= 0) return BUDGET_MARKER;
  let out = sanitizeMcpDescription(value);
  if (out.length > budget.remaining) {
    out = out.slice(0, budget.remaining) + TRUNCATION_MARKER;
  }
  budget.remaining -= out.length;
  return out;
}

function walkSchema(
  node: unknown,
  depth: number,
  seen: WeakSet<object>,
  budget: { remaining: number },
): unknown {
  if (node === null || typeof node !== 'object') return node;
  // Fail closed: never forward server-supplied subtrees that the
  // sanitizer did not process.
  if (depth > MAX_SCHEMA_DEPTH) return DEPTH_MARKER;
  if (seen.has(node as object)) return CYCLE_MARKER;
  seen.add(node as object);

  if (Array.isArray(node)) {
    return node.map((v) => walkSchema(v, depth + 1, seen, budget));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (ANNOTATION_KEYS.has(k) && typeof v === 'string') {
      out[k] = sanitizeAnnotation(v, budget);
    } else if (DATA_VALUE_KEYS.has(k)) {
      out[k] = v;
    } else {
      out[k] = walkSchema(v, depth + 1, seen, budget);
    }
  }
  return out;
}
