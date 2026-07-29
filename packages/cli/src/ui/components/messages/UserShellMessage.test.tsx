/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { UserShellMessage } from './UserShellMessage.js';

// Mock useIsScreenReaderEnabled
const mockUseIsScreenReaderEnabled = vi.fn();
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useIsScreenReaderEnabled: () => mockUseIsScreenReaderEnabled(),
  };
});

describe('UserShellMessage', () => {
  it('renders with standard prefix when screen reader is disabled', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    expect(lastFrame()).toContain('$ ');
    expect(lastFrame()).toContain('ls -la');
  });

  it('renders with screen reader prefix when screen reader is enabled', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(true);
    const { lastFrame } = render(<UserShellMessage text="ls -la" />);
    expect(lastFrame()).toContain('[shell] ');
    expect(lastFrame()).toContain('ls -la');
  });

  it('removes leading ! from command', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
    const { lastFrame } = render(<UserShellMessage text="!ls -la" />);
    expect(lastFrame()).toContain('$ ');
    expect(lastFrame()).toContain('ls -la');
    expect(lastFrame()).not.toContain('!ls -la');
  });
});
