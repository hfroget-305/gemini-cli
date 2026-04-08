## 2025-05-22 - [Discoverability of CLI shortcuts]
**Learning:** Many powerful CLI features like reverse search (Ctrl+R) and standard line editing (Ctrl+A/E) are often implemented but undocumented in the UI, making them "hidden" to most users.
**Action:** Always check the keyboard handler logic to see if there are useful shortcuts that can be added to the help menu to improve discoverability.

## 2025-05-22 - [Ink Accessibility]
**Learning:** In the Ink CLI framework, `aria-label` is supported on `<Text>` components but typically not on `<Box>` components unless specifically extended.
**Action:** Apply accessibility labels to text elements rather than layout containers in terminal UIs.
