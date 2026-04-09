# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-15 - Standardizing Terminal Accessibility Prefixes
**Learning:** Terminal screen readers often fail to announce Unicode icons (ℹ, ⚠, ✖) or provide confusing descriptions. Conditional rendering using Ink's `useIsScreenReaderEnabled` hook allows swapping these icons for clear textual prefixes (e.g., `[warning] `) while maintaining a clean visual UI for sighted users.
**Action:** Always use `useIsScreenReaderEnabled` to provide textual fallbacks for visual indicators in CLI components. Centralize these prefixes and icons in a shared constants file (like `textConstants.ts`) to ensure consistency and simplify layout calculations (e.g., matching container widths to prefix lengths).
