## 2025-05-14 - Screen Reader Accessible Debug Console
**Learning:** Terminal screen readers may not consistently process `aria-label` on `Text` and `Box` components in Ink. For critical visual-only elements like icons, conditional rendering using `useIsScreenReaderEnabled` to display text-based prefixes is the most robust way to ensure accessibility.
**Action:** When adding icons to the UI, always provide a textual fallback for screen readers by checking `useIsScreenReaderEnabled`.
