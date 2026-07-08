## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes

**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or
inconsistent for screen reader users. Conditional rendering using
`useIsScreenReaderEnabled` to swap these icons for textual prefixes like
"[warning] " significantly improves accessibility. **Action:** When adding
diagnostic icons or status indicators, always provide a textual fallback for
screen readers. Ensure layout constants (like `iconBoxWidth`) and height
estimations account for the increased width of these text-based prefixes.

## 2025-05-16 - Accessible Shell Command Prefixes
**Learning:** Generic symbols like "$ " are often ignored or confusing for screen readers. Swapping them for "[shell] " provides much-needed context. Combining this with a fixed-width flex layout ensures that long commands wrap correctly without indenting under the prefix, improving visual hierarchy.
**Action:** Use fixed-width prefix containers (flexShrink=0) and textual prefixes for screen readers when using prompt-style symbols.
