## 2025-05-22 - [Accessibility: ASCII Art and Indicators]
**Learning:** Terminal-based UIs using Ink can be made much more accessible by adding `aria-label` to components that display decorative or semantic ASCII art and special indicators (like `(r:)` for search). This is especially important for screen reader users who would otherwise hear confusing character sequences.
**Action:** Always check for ASCII art and non-textual indicators and ensure they have a descriptive `aria-label`. Use `textConstants.ts` to manage these labels for consistency.
