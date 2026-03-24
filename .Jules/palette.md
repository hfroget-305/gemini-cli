## 2025-05-15 - [Screen Reader Accessibility for Terminal Icons]
**Learning:** Decorative icons in terminal UIs (Ink) are often inaccessible to screen reader users as they lack semantic meaning or textual equivalents. Using `useIsScreenReaderEnabled` to conditionally render text-based prefixes (e.g., `[error] `) instead of icons (e.g., `✖`) significantly improves accessibility.
**Action:** Always provide textual fallbacks for visual icons in terminal components using `useIsScreenReaderEnabled` and standardize these labels in a central constants file.
