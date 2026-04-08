## 2025-05-15 - [Terminal Screen Reader Accessibility]
**Learning:** In terminal-based UIs (Ink), visual-only icons (like ✖ or ⚠) are often silent or misinterpreted by screen readers. Swapping these for textual prefixes like "[error] " or "[warning] " when a screen reader is detected ensures critical status information is accessible.
**Action:** Use the `useIsScreenReaderEnabled` hook from `ink` to provide textual fallback or descriptive prefixes for visual indicators in CLI tools.
