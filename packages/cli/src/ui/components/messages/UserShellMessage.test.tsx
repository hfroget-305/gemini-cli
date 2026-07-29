/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi } from 'vitest';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  it('renders shell message with correct prefix', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ls -la');
  });

  it('removes leading exclamation mark', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!npm test" />);
    const output = lastFrame();

    expect(output).toContain('$ npm test');
    expect(output).not.toContain('$ !npm test');
  });

  it('renders with screen reader prefix when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ls -la');
    expect(output).not.toContain('$');
  });
});
