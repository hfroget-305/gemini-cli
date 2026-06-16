## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-21 - Standardized Transient Status Prefixes
**Learning:** Transient status messages in the composer (like exit prompts or queue errors) often lack the diagnostic icons and screen reader prefixes used by persistent messages, leading to a "jumpy" UI when they appear and poor accessibility.
**Action:** Use a fixed-width prefix container (3 for visual, 11 for screen reader) for all transient status messages in `Composer.tsx` to ensure vertical alignment with the message gutter and consistent accessibility. Use `textConstants.ts` for all icons and prefixes.
