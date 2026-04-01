## 2025-05-15 - [Screen Reader Accessibility in CLI]
**Learning:** Terminal screen readers often fail to announce visual-only icons (like ✖, ⚠, ℹ). Providing textual fallbacks via `useIsScreenReaderEnabled` significantly improves accessibility.
**Action:** Use `useIsScreenReaderEnabled` to provide textual prefixes for diagnostic messages and ensure these containers have `flexShrink={0}` to prevent layout breakage.
