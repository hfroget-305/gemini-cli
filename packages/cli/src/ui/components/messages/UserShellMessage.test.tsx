/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserShellMessage } from './UserShellMessage.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('ink', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

describe('UserShellMessage', () => {
  const mockUseIsScreenReaderEnabled = vi.mocked(useIsScreenReaderEnabled);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with standard prefix when screen reader is disabled', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
    expect(output).not.toContain('[shell]');
  });

  it('renders with screen reader prefix when enabled', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ');
    expect(output).toContain('ls -la');
    expect(output).not.toContain('$ ');
  });

  it('strips leading ! from command text', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!npm test" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('npm test');
    expect(output).not.toContain('!npm test');
  });

  it('renders multiline shell command', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
    const command = 'echo "hello" \\\n  && echo "world"';
    const { lastFrame } = render(<UserShellMessage text={command} />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('echo "hello"');
    expect(output).toContain('&& echo "world"');
  });
});
