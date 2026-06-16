## 2025-05-15 - Screen Reader Accessible Diagnostic Prefixes
**Learning:** Terminal icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Conditional rendering using `useIsScreenReaderEnabled` to swap these icons for textual prefixes like "[warning] " significantly improves accessibility.
**Action:** When adding diagnostic icons or status indicators, always provide a textual fallback for screen readers. Ensure layout constants (like `iconBoxWidth`) and height estimations account for the increased width of these text-based prefixes.

## 2025-05-16 - Standardizing Message Prefixes for Accessibility
**Learning:** While `aria-label` is supported by the CLI's Ink fork, terminal screen readers may not consistently process it. Conditional rendering using `useIsScreenReaderEnabled` to swap visual symbols ('> ', '✦ ', '$ ') for text-based prefixes ('User: ', 'Model: ', '[shell] ') is the project standard for ensuring reliable terminal accessibility.
**Action:** Use conditional rendering for all message prefixes and ensure the prefix container has `flexShrink={0}` and a dynamic width based on the prefix length to maintain proper layout and gutter alignment.
