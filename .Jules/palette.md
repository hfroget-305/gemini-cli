## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes

**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or
inconsistent for screen reader users. Conditional rendering using
`useIsScreenReaderEnabled` to swap these icons for textual prefixes like
"[warning] " significantly improves accessibility. **Action:** When adding
diagnostic icons or status indicators, always provide a textual fallback for
screen readers. Ensure layout constants (like `iconBoxWidth`) and height
estimations account for the increased width of these text-based prefixes.

## 2026-07-07 - Consistent Shell Message Accessibility

**Learning:** Symbolic prefixes like `$ ` in terminal UIs are often unannounced
by screen readers. Swapping them for textual prefixes like `[shell] ` and using
a row-based flexbox layout with fixed-width prefix containers ensures both
accessibility and visual alignment of wrapped multi-line commands.
**Action:** Use `SCREEN_READER_SHELL_PREFIX` and `SCREEN_READER_PREFIX_WIDTH` for
shell message components. Pass `terminalWidth` to ensure proper wrapping within
the layout context.
