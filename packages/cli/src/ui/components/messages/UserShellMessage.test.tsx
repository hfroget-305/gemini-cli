/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ink', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

import { useIsScreenReaderEnabled } from 'ink';

describe('UserShellMessage', () => {
  beforeEach(() => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
  });

  it('renders shell command with correct prefix', () => {
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('removes leading ! from command', () => {
    const { lastFrame } = render(<UserShellMessage text="!npm test" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('npm test');
    expect(output).not.toContain('!npm test');
  });

  it('renders with screen reader prefix when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);

    const { lastFrame } = render(<UserShellMessage text="pwd" />);
    const output = lastFrame();
    expect(output).toContain('[shell] ');
    expect(output).toContain('pwd');
  });
});
