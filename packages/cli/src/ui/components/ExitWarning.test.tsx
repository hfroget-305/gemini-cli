/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { ExitWarning } from './ExitWarning.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUIState, type UIState } from '../contexts/UIStateContext.js';
import { WARNING_ICON, SCREEN_READER_WARNING } from '../textConstants.js';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('../contexts/UIStateContext.js');
vi.mock('ink', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ink')>()),
  useIsScreenReaderEnabled: vi.fn(),
}));

describe('ExitWarning', () => {
  const mockUseUIState = vi.mocked(useUIState);
  const mockUseIsScreenReaderEnabled = vi.mocked(useIsScreenReaderEnabled);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsScreenReaderEnabled.mockReturnValue(false);
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

  it('renders Ctrl+C warning when pressed once and dialogs visible', () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    const output = lastFrame()!;
    expect(output).toContain(WARNING_ICON);
    expect(output).toContain('Press Ctrl+C again to exit');
  });

  it('renders Ctrl+D warning when pressed once and dialogs visible', () => {
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: false,
      ctrlDPressedOnce: true,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    const output = lastFrame()!;
    expect(output).toContain(WARNING_ICON);
    expect(output).toContain('Press Ctrl+D again to exit');
  });

  it('renders with screen reader prefix when enabled', () => {
    mockUseIsScreenReaderEnabled.mockReturnValue(true);
    mockUseUIState.mockReturnValue({
      dialogsVisible: true,
      ctrlCPressedOnce: true,
      ctrlDPressedOnce: false,
    } as unknown as UIState);
    const { lastFrame } = render(<ExitWarning />);
    const output = lastFrame()!;
    expect(output).toContain(SCREEN_READER_WARNING.trim());
    expect(output).toContain('Press Ctrl+C again to exit');
    expect(output).not.toContain(WARNING_ICON);
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
