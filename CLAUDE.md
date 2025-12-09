# CLAUDE.md - AI Assistant Guide for Gemini CLI

This document provides essential context for AI assistants working with the
Gemini CLI codebase.

## Quick Reference

### Essential Commands

```bash
# Full validation (ALWAYS run before submitting changes)
npm run preflight

# Individual commands
npm run build          # Build all packages
npm run test           # Run unit tests
npm run typecheck      # Type checking
npm run lint           # Lint code
npm run format         # Format code with Prettier

# Development
npm start              # Run the CLI in development mode
npm run debug          # Run with debugger (--inspect-brk)

# Testing
npm run test:e2e                        # Integration tests (sandbox disabled)
npm run test:integration:sandbox:docker # Integration tests with Docker sandbox
```

### Quick Facts

- **Main branch**: `main`
- **Node.js version**: 20 (see `.nvmrc`), specifically `~20.19.0` for development
- **Package manager**: npm with workspaces
- **Testing framework**: Vitest
- **UI framework**: React with Ink (terminal UI library)
- **Module system**: ES Modules (ESM)

## Repository Structure

```
gemini-cli/
├── packages/
│   ├── cli/              # Frontend - user-facing terminal interface
│   │   └── src/
│   │       ├── ui/       # React/Ink components
│   │       ├── commands/ # CLI command handlers
│   │       ├── services/ # CLI services
│   │       └── utils/    # CLI utilities
│   ├── core/             # Backend - API interactions, tool execution
│   │   └── src/
│   │       ├── tools/    # Tool implementations (edit, grep, shell, etc.)
│   │       ├── mcp/      # Model Context Protocol integration
│   │       ├── services/ # Core services
│   │       └── prompts/  # Prompt templates
│   ├── a2a-server/       # A2A server (experimental)
│   ├── test-utils/       # Shared test utilities
│   └── vscode-ide-companion/  # VS Code extension
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
├── integration-tests/    # E2E tests
└── .gemini/              # Gemini CLI configuration and commands
```

## Code Conventions

### TypeScript Guidelines

1. **Prefer plain objects over classes** - Use TypeScript interfaces/types with
   plain objects for better React integration and immutability

2. **Use ES Module syntax** - Leverage `import`/`export` for encapsulation
   instead of class-based private/public members

3. **Avoid `any` type** - Use `unknown` with proper type narrowing instead

4. **Use exhaustive switch checks** - Import `checkExhaustive` from
   `packages/cli/src/utils/checks.ts`:
   ```typescript
   switch (enumValue) {
     case Enum.A:
     case Enum.B:
       break;
     default:
       checkExhaustive(enumValue);
   }
   ```

5. **Prefer array operators** - Use `.map()`, `.filter()`, `.reduce()` over
   imperative loops

6. **Use consistent type imports**:
   ```typescript
   import type { SomeType } from './types.js';
   ```

### React Guidelines (Ink-based CLI UI)

1. **Functional components only** - No class components
2. **No `setState` in `useEffect`** - This degrades performance
3. **Avoid `useEffect` when possible** - Only for external synchronization
4. **Keep components pure** - No side effects during rendering
5. **One-way data flow** - Pass data down via props
6. **Effects should return cleanup functions**
7. **No manual memoization needed** - React Compiler handles optimization

### File Naming

- Test files: `*.test.ts` or `*.test.tsx` (co-located with source)
- Use hyphens in flag names: `--my-flag` not `--my_flag`

### License Headers

All source files must include:

```typescript
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
```

### Import Restrictions

- Use relative imports within packages (no self-imports like
  `@google/gemini-cli-core` from within core)
- Avoid `require()` - use ES6 imports
- Prefix Node built-ins with `node:` (e.g., `import fs from 'node:fs'`)

## Testing Patterns

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do something', () => {
    // test implementation
  });
});
```

### Mocking

```typescript
// Mock ES modules (place at top of file before other imports)
vi.mock('module-name', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, someFunction: vi.fn() };
});

// Hoisted mocks for module-level dependencies
const myMock = vi.hoisted(() => vi.fn());
```

### React Component Testing (Ink)

```typescript
import { render } from 'ink-testing-library';

it('renders correctly', () => {
  const { lastFrame } = render(<MyComponent />);
  expect(lastFrame()).toContain('expected text');
});
```

### Async Testing

```typescript
// Use fake timers
vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(1000);

// Test rejections
await expect(promise).rejects.toThrow('error message');
```

## Key Files

| File                                   | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `packages/cli/src/gemini.tsx`          | Main CLI entry point                 |
| `packages/cli/src/ui/AppContainer.tsx` | Primary UI container                 |
| `packages/core/src/tools/tools.ts`     | Tool registry and definitions        |
| `packages/core/src/index.ts`           | Core package exports                 |
| `GEMINI.md`                            | Detailed coding guidelines           |
| `CONTRIBUTING.md`                      | Contribution process                 |
| `docs/architecture.md`                 | Architecture overview                |
| `.prettierrc.json`                     | Prettier configuration               |
| `eslint.config.js`                     | ESLint configuration                 |
| `tsconfig.json`                        | TypeScript configuration             |
| `packages/cli/src/utils/checks.ts`     | `checkExhaustive` helper             |

## Available Tools (in packages/core/src/tools/)

- `edit.ts` - File editing
- `write-file.ts` - File writing
- `read-file.ts` / `read-many-files.ts` - File reading
- `glob.ts` - File pattern matching
- `grep.ts` / `ripGrep.ts` - Content searching
- `shell.ts` - Shell command execution
- `web-fetch.ts` - Web content fetching
- `web-search.ts` - Web searching
- `mcp-*.ts` - Model Context Protocol tools
- `memoryTool.ts` - Memory/state management

## Development Workflow

1. **Before making changes**: Read relevant existing code and tests
2. **Make changes**: Follow conventions above
3. **Test locally**: `npm run test` for unit tests
4. **Run preflight**: `npm run preflight` (required before PRs)
5. **Commit**: Use Conventional Commits format
   (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)

## Debugging

```bash
# VS Code: Press F5 or use launch configurations
npm run debug  # Starts with --inspect-brk

# With sandbox
DEBUG=1 gemini

# React DevTools (for Ink UI)
DEV=true npm start
npx react-devtools@4.28.5
```

## Documentation

- Located in `/docs` directory
- Follow
  [Google Developer Documentation Style Guide](https://developers.google.com/style)
- Use sentence case for headings
- Update `docs/sidebar.json` when adding new pages
- Always refer to the product as "Gemini CLI" (not "the Gemini CLI")

## Comments Policy

Only write high-value comments when necessary. Avoid using comments to
communicate with users or explain obvious code.

## Common Pitfalls

1. **Don't forget `npm run preflight`** - This catches most issues
2. **Self-imports** - Don't import `@google/gemini-cli-core` from within core
   package
3. **Throwing non-Errors** - Always use `throw new Error()`, not string literals
4. **Floating promises** - Use `await` or handle promise rejections properly
5. **Default exports** - Prefer named exports in the CLI package
