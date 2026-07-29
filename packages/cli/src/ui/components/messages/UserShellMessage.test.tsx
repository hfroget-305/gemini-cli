/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { describe, it, expect, vi } from 'vitest';
import { UserShellMessage } from './UserShellMessage.js';
import React from 'react';

vi.mock('ink', async (importOriginal) => {
  const original = (await importOriginal()) as any;
  return {
    ...original,
    useIsScreenReaderEnabled: vi.fn(() => false),
  };
});

import { useIsScreenReaderEnabled } from 'ink';

describe('UserShellMessage', () => {
  it('renders shell message with correct prefix', () => {
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('ls -la');
  });

  it('removes leading ! from text', () => {
    const { lastFrame } = render(<UserShellMessage text="!pwd" />);
    const output = lastFrame();

    expect(output).toContain('$ ');
    expect(output).toContain('pwd');
    expect(output).not.toContain('!pwd');
  });

  it('renders with screen reader prefix when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="whoami" />);
    const output = lastFrame();

    expect(output).toContain('[shell] ');
    expect(output).toContain('whoami');
    expect(output).not.toContain('$ ');
  });
});
