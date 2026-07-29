/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import { useIsScreenReaderEnabled } from 'ink';
import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';

vi.mock('ink', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  it('renders command with default prefix when screen reader is disabled', () => {
    (useIsScreenReaderEnabled as Mock).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('renders command with screen reader prefix when enabled', () => {
    (useIsScreenReaderEnabled as Mock).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="pwd" />);
    const output = lastFrame();
    expect(output).toContain('[shell] ');
    expect(output).toContain('pwd');
  });

  it('removes leading "!" from command text', () => {
    (useIsScreenReaderEnabled as Mock).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!git status" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('git status');
    expect(output).not.toContain('!git status');
  });
});
