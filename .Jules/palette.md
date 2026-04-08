## 2025-03-23 - Screen Reader Accessibility for Diagnostic Icons
**Learning:** In terminal-based UIs (Ink), visual icons like emojis (✖, ⚠, ℹ) are not consistently read by screen readers or lack semantic context. Conditional rendering using `useIsScreenReaderEnabled` allows providing textual fallbacks like `[error] ` or `[warning] ` that are much more accessible.
**Action:** Always check if a visual icon-only element has a screen reader fallback. Centralize these prefixes with their corresponding icons to ensure consistency and layout predictability.
