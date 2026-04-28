/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi } from 'vitest';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  it('renders shell command with $ prefix', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('renders shell command with [shell] prefix for screen readers', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ');
    expect(output).toContain('ls -la');
  });

  it('strips leading ! from command', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!npm start" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('npm start');
    expect(output).not.toContain('!npm start');
  });
});
