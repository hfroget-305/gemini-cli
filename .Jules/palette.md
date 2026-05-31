## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-15 - Standardized Prefix Widths for Gutter Alignment
**Learning:** Inconsistent gutter widths across different message types (User, Model, Shell, Diagnostic) create a "jagged" visual appearance. Standardizing both visual symbols (3 cells) and screen reader text (11 cells) ensures a clean vertical line and predictable layout for all users.
**Action:** Use centralized `VISUAL_PREFIX_WIDTH` and `SCREEN_READER_PREFIX_WIDTH` constants from `textConstants.ts` in all persistent message components to maintain gutter integrity.
