## 2025-05-15 - [Screen Reader Prefix Accessibility]
**Learning:** Screen readers often ignore or mispronounce Unicode icons in terminal UIs; providing descriptive text prefixes (e.g., '[info] ') is essential for accessibility.
**Action:** Always check if a screen reader is enabled using `useIsScreenReaderEnabled` and provide textual fallbacks for visual-only status indicators.
