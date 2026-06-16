/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { ExitWarning } from './ExitWarning.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUIState, type UIState } from '../contexts/UIStateContext.js';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('../contexts/UIStateContext.js');
vi.mock('ink', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useIsScreenReaderEnabled: vi.fn(),
}));

describe('ExitWarning', () => {
  const mockUseUIState = vi.mocked(useUIState);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing by default', () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: false,
      ctrlCPressedOnce: false,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toBe('');
  });

  it('renders Ctrl+C warning with icon when pressed once and dialogs visible', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toContain('⚠');
    expect(lastFrame()).toContain('Press Ctrl+C again to exit');
  });

  it('renders Ctrl+C warning with screen reader prefix when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toContain('[warning]');
    expect(lastFrame()).toContain('Press Ctrl+C again to exit');
  });

  it('renders Ctrl+D warning when pressed once and dialogs visible', () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: false,
      ctrlDPressedOnce: true,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toContain('Press Ctrl+D again to exit');
  });

  it('renders nothing if dialogs are not visible', () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: false,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: true,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    expect(lastFrame()).toBe('');
  });
});
