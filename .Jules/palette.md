## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-12-07 - Standardized Message Gutter and Accessibility Prefixes
**Learning:** Standardizing the visual gutter width (3) and screen reader prefix width (11) across all message types (`UserMessage`, `GeminiMessage`, `UserShellMessage`, `CompressionMessage`) ensures vertical alignment of content and a consistent accessibility experience. Swapping visual symbols for textual prefixes via `useIsScreenReaderEnabled` is more robust than using `aria-label` on individual icons.
**Action:** Use `VISUAL_PREFIX_WIDTH` and `SCREEN_READER_PREFIX_WIDTH` from `textConstants.ts` for all new message components to maintain terminal UI alignment.
