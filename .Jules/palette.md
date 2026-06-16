## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-20 - Consolidating Transient Status Messages
**Learning:** Transient status messages (exit prompts, queue errors, escape hints) often lack consistent diagnostic icons and vertical alignment. Encapsulating these in a dedicated sub-component with fixed-width prefix containers (3 for visual, 11 for screen reader) ensures UI consistency and accessibility across the app.
**Action:** Use a standardized status pattern to manage multiple conditional alerts, ensuring icons/prefixes are prioritized and aligned with the app's diagnostic standard.
