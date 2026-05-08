/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi } from 'vitest';
import * as ink from 'ink';

vi.mock('ink', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  it('renders normal shell message with default prefix', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
    expect(output).toMatchSnapshot();
  });

  it('renders shell message with screen reader prefix when enabled', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="pwd" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ');
    expect(output).toContain('pwd');
    expect(output).toMatchSnapshot();
  });

  it('removes leading ! from command', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!echo hello" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('echo hello');
    expect(output).not.toContain('!echo hello');
    expect(output).toMatchSnapshot();
  });
});
