## 2025-12-07 - Screen Reader Accessibility in Terminal UIs

**Learning:** Terminal screen readers often fail to announce Unicode icons or
`aria-label` attributes on `Text` components reliably. The
`useIsScreenReaderEnabled` hook from the custom Ink fork provides a more robust
way to handle this by allowing conditional rendering of text-based prefixes.
**Action:** Always prefer textual prefixes (e.g., `[error] `) over icons (e.g.,
`✖`) when `isScreenReaderEnabled` is true, and ensure layout constants (like box
widths) are adjusted to prevent text wrapping issues.
