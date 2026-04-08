## 2025-05-15 - [Terminal Accessibility Patterns]
**Learning:** Terminal screen readers primarily rely on the text buffer. While `aria-label` is supported by our Ink fork, conditional rendering of descriptive text prefixes (e.g., swapping '⚠' for '[warning] ') is a more reliable way to convey visual status icons to screen reader users in the CLI.
**Action:** Use `useIsScreenReaderEnabled` and centralized text constants to provide textual fallbacks for visual-only diagnostic icons.
