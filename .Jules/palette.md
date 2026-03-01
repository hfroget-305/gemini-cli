# Palette's UX & Accessibility Journal

## 2025-05-15 - Visual Hierarchy in Terminal Lists
**Learning:** Terminal-based UIs can easily become cluttered when multiple lines of text are presented. Using bold accents for headers and indentation for subsequent list items significantly improves the visual hierarchy and readability, helping users quickly distinguish between the overall topic and its individual points.
**Action:** When presenting tips, instructions, or multi-step processes in the CLI, use `bold` and `theme.text.accent` for the header and `paddingLeft={1}` for the content to create a clear, accessible structure.
