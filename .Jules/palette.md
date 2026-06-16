## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-20 - Standardized Message Prefixes for Screen Readers
**Learning:** Using decorative symbols (✦, >, $) as message prefixes is confusing for screen readers. Swapping these for textual prefixes ("Model: ", "User: ", "[shell] ") when a screen reader is active, and using a fixed 11-character width for these prefixes, ensures vertical alignment and clear context.
**Action:** Use `useIsScreenReaderEnabled` to swap symbols for text and maintain a consistent gutter by using `prefixWidth={isScreenReaderEnabled ? 11 : 2}` for persistent messages.
