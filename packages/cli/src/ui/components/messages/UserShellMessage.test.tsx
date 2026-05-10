/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi } from 'vitest';

vi.mock('ink', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    useIsScreenReaderEnabled: vi.fn(() => false),
  };
});

import { useIsScreenReaderEnabled } from 'ink';

describe('UserShellMessage', () => {
  it('renders with the standard prefix when screen reader is disabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('renders with the screen reader prefix when screen reader is enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('[shell] ');
    expect(output).toContain('ls -la');
  });

  it('removes leading ! from command text', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
    expect(output).not.toContain('!ls -la');
  });
});
