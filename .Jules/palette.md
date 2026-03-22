## 2025-05-15 - [Screen Reader Prefix Standardization]
**Learning:** Terminal screen readers often struggle with visual-only icons. While `aria-label` is supported in some Ink environments, explicit text prefixes like `[error] ` are more reliable. Standardizing these in a central `textConstants.ts` file ensures UI consistency and simplifies accessibility audits.
**Action:** Always check for `useIsScreenReaderEnabled` when using decorative icons and provide a meaningful text-based fallback or prefix.

## 2025-05-15 - [Layout Integrity with Dynamic Prefixes]
**Learning:** Adding text-based screen reader prefixes (e.g., swapping a 1-character icon for an 8-character string) can break terminal layouts or cause content compression if not handled carefully with `flexShrink={0}` and dynamic width calculations for icon containers.
**Action:** Use `flexShrink={0}` on prefix/icon containers and dynamically calculate `width` or `iconBoxWidth` based on the active display mode (screen reader vs. standard).
