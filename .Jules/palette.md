## 2025-03-16 - Standardizing Screen Reader Prefixes
**Learning:** Terminal screen readers often struggle with `aria-label` on visual-only elements like icons. A more robust pattern in Ink is to use `useIsScreenReaderEnabled` to conditionally render text-based prefixes (e.g., `[warning] `) directly in the component output.
**Action:** Always check for `useIsScreenReaderEnabled` support in the Ink fork and prioritize conditional text prefixes over `aria-label` for critical status indicators.
