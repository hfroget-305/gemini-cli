## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes

**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or
inconsistent for screen reader users. Conditional rendering using
`useIsScreenReaderEnabled` to swap these icons for textual prefixes like
"[warning] " significantly improves accessibility. **Action:** When adding
diagnostic icons or status indicators, always provide a textual fallback for
screen readers. Ensure layout constants (like `iconBoxWidth`) and height
estimations account for the increased width of these text-based prefixes.
