## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-28 - Standardized Message Gutter Accessibility
**Learning:** For persistent terminal messages (User, Gemini, Shell), using a fixed-width prefix container (11 for screen readers, 2 for symbols) with `flexShrink={0}` ensures a consistent vertical gutter and prevents layout collapse in narrow terminal windows. Removing redundant `aria-label` attributes when swapping text content prevents double-announcements by some screen readers.
**Action:** Standardize all message-like components to use this fixed-width container pattern. Use `SCREEN_READER_SHELL_PREFIX` for shell commands to match existing user/model prefix patterns.
