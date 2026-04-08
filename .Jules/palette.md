## 2025-05-15 - [Screen Reader Accessibility in Terminal UI]
**Learning:** Terminal screen readers often fail to announce visual-only icons (like ⚠ or ✖). Providing a textual prefix (e.g., '[warning] ') when `useIsScreenReaderEnabled` is true significantly improves accessibility.
**Action:** Always check `useIsScreenReaderEnabled` when using icons for status indication and provide a text fallback. Ensure layout components (Box widths, etc.) can handle the variable width of these prefixes.
