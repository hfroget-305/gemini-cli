## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-12-07 - Prefer Textual Prefixes over aria-label for Message Types
**Learning:** In terminal environments, `aria-label` on symbols (like `>`, `✦`, `$`) can be inconsistent. Swapping the symbol for a textual prefix (e.g., `User: `, `Model: `, `[shell] `) using `useIsScreenReaderEnabled` is the project's most reliable accessibility pattern for persistent message streams.
**Action:** Use a dedicated, fixed-width prefix container with `flexShrink={0}` and `useIsScreenReaderEnabled` to toggle between visual symbols and textual labels for all message components.
