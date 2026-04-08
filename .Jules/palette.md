## 2025-05-15 - [Accessible Terminal Diagnostics]
**Learning:** Terminal diagnostic icons (⚠, ✖, ℹ, 🔍) are often unannounced or inconsistent for screen reader users. Using `useIsScreenReaderEnabled` to conditionally render textual prefixes like '[warning] ' improves accessibility while maintaining visual layout via dynamic width constants.
**Action:** Standardize diagnostic icons and screen reader labels in `textConstants.ts` and apply `flexShrink={0}` to prefix containers to prevent label compression.
