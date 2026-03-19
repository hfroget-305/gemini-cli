## 2025-05-15 - [Screen Reader Accessibility in Terminal UI]
**Learning:** Terminal screen readers often fail to announce or inconsistently announce visual icons (e.g., ✖, ⚠, ℹ). Providing textual fallbacks (e.g., [error], [warning]) via `useIsScreenReaderEnabled` significantly improves accessibility.
**Action:** Always provide text-based prefixes for status indicators when a screen reader is detected, and use `flexShrink={0}` on their containers to prevent layout compression.
