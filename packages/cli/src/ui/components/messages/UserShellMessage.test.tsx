/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { describe, it, expect, vi } from 'vitest';
import { UserShellMessage } from './UserShellMessage.js';
import * as ink from 'ink';

vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof ink>('ink');
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage Component', () => {
  it('should render with $ prefix by default', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame, unmount } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ls -la');
    unmount();
  });

  it('should render with [shell] prefix when screen reader is enabled', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame, unmount } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ls -la');
    unmount();
  });

  it('should strip leading ! from the text', () => {
    vi.mocked(ink.useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame, unmount } = render(<UserShellMessage text="!ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ls -la');
    unmount();
  });
});
