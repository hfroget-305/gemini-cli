## 2025-05-22 - [Enhancing CLI Accessibility with `aria-label`]
**Learning:** The CLI's custom Ink framework supports `aria-label` on `Text` and `Box` components to provide semantic meaning for screen readers, even though standard Ink might not. This is critical for conveying the meaning of symbols or ASCII art that would otherwise be confusing when read character-by-character.
**Action:** Always check for symbols or ASCII art in UI components and provide descriptive `aria-label` values, ensuring the labels are centralized in `textConstants.ts` for consistency.
