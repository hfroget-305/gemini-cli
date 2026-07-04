## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes

**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or
inconsistent for screen reader users. Conditional rendering using
`useIsScreenReaderEnabled` to swap these icons for textual prefixes like
"[warning] " significantly improves accessibility. **Action:** When adding
diagnostic icons or status indicators, always provide a textual fallback for
screen readers. Ensure layout constants (like `iconBoxWidth`) and height
estimations account for the increased width of these text-based prefixes.

## 2025-05-20 - Standardized Message Prefixes and Alignment

**Learning:** Consistent vertical alignment of message prefixes (User, Model, Shell) creates a clean "gutter" that improves readability. Swapping visual-only symbols ('>', '✦', '$') for textual labels ('User:', 'Model:', '[shell]') via `useIsScreenReaderEnabled` and removing `aria-label` prevents redundant announcements while ensuring accessibility. **Action:** Use `VISUAL_PREFIX_WIDTH` (2) and `SCREEN_READER_PREFIX_WIDTH` (11) constants with `flexShrink={0}` containers for all persistent message types to maintain a stable layout.
