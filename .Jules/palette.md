## 2026-02-28 - [CLI Accessibility with aria-label]
**Learning:** The project's custom Ink fork (@jrichman/ink) supports the `aria-label` attribute on `Text` and `Box` components. This allows for providing semantic meaning to visual-only elements like diagnostic icons and ASCII art, which would otherwise be read literally (or not at all) by screen readers.
**Action:** Always use `aria-label` for icons, status indicators, and ASCII art in this CLI to maintain high accessibility standards.
