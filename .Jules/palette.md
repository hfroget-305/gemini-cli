## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2026-04-30 - Standardizing Transient Status Messages
**Learning:** Transient status messages (e.g., "Press Ctrl+C again to exit") should follow the same accessible diagnostic patterns as persistent messages. Using a fixed-width prefix container (3 for icons, 11 for screen reader text) ensures gutter alignment and consistent UX across all message types.
**Action:** Apply the `useIsScreenReaderEnabled` icon-swapping pattern and prefix container layout to all status and warning indicators, even those that are temporary or inline.
