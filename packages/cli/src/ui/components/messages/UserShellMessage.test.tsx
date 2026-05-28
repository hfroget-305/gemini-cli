/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('ink', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  it('renders shell command with $ prefix when screen reader is disabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ls -la');
  });

  it('renders shell command with [shell] prefix when screen reader is enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();
    expect(output).toContain('[shell] ls -la');
  });

  it('strips leading ! from command', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!ls -la" />);
    const output = lastFrame();
    expect(output).toContain('$ ls -la');
  });
});
