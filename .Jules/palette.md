/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

## 2025-05-15 - [Accessible Diagnostic Icons in Terminal UI]
**Learning:** Terminal screen readers often skip or incorrectly announce diagnostic icons (✖, ⚠, ℹ). While standard Ink doesn't detect screen readers, this project's custom fork provides `useIsScreenReaderEnabled`. Using this hook to swap icons for textual prefixes like `[error] ` significantly improves accessibility. However, since these labels vary in length, a fixed-width gutter (e.g., `width={11}`) for the prefix box is essential to maintain vertical alignment of message content.
**Action:** When implementing diagnostic indicators, always provide a textual fallback for screen readers and use a consistent fixed-width container for the prefix to preserve UI alignment.
