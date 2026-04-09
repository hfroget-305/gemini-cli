## 2025-05-15 - [Diagnostic Icons & Terminal Accessibility]
**Learning:** Terminal screen readers often struggle with visual-only icons (ℹ, ⚠, ✖, 🔍). While `aria-label` is supported in some terminal emulators, explicit text prefixes (e.g., `[warning] `) are more reliable for accessibility.
**Action:** Use the `useIsScreenReaderEnabled` hook from Ink to swap icons with descriptive text prefixes, and ensure layout constants (like `iconBoxWidth`) are updated dynamically to avoid text truncation.
