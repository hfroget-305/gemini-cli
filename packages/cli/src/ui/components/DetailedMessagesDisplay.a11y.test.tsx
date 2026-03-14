/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { DetailedMessagesDisplay } from './DetailedMessagesDisplay.js';
import { describe, it, expect, vi } from 'vitest';
import type { ConsoleMessageItem } from '../types.js';
import { Box, useIsScreenReaderEnabled } from 'ink';
import type React from 'react';
import {
  SCREEN_READER_DEBUG,
  SCREEN_READER_ERROR,
  SCREEN_READER_INFO,
  SCREEN_READER_WARNING,
} from '../textConstants.js';

vi.mock('ink', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

vi.mock('./shared/ScrollableList.js', () => ({
  ScrollableList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (props: { item: unknown }) => React.ReactNode;
  }) => (
    <Box flexDirection="column">
      {data.map((item: unknown, index: number) => (
        <Box key={index}>{renderItem({ item })}</Box>
      ))}
    </Box>
  ),
}));

describe('DetailedMessagesDisplay Screen Reader', () => {
  it('renders screen reader prefixes when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);

    const messages: ConsoleMessageItem[] = [
      { type: 'log', content: 'Log message', count: 1 },
      { type: 'warn', content: 'Warning message', count: 1 },
      { type: 'error', content: 'Error message', count: 1 },
      { type: 'debug', content: 'Debug message', count: 1 },
    ];

    const { lastFrame } = render(
      <DetailedMessagesDisplay
        messages={messages}
        maxHeight={20}
        width={80}
        hasFocus={true}
      />,
    );
    const output = lastFrame();

    expect(output).toContain(SCREEN_READER_INFO);
    expect(output).toContain(SCREEN_READER_WARNING);
    expect(output).toContain(SCREEN_READER_ERROR);
    expect(output).toContain(SCREEN_READER_DEBUG);
    expect(output).not.toContain('ℹ');
    expect(output).not.toContain('⚠');
    expect(output).not.toContain('✖');
    expect(output).not.toContain('🔍');
  });

  it('renders icons when screen reader is disabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);

    const messages: ConsoleMessageItem[] = [
      { type: 'log', content: 'Log message', count: 1 },
      { type: 'warn', content: 'Warning message', count: 1 },
      { type: 'error', content: 'Error message', count: 1 },
      { type: 'debug', content: 'Debug message', count: 1 },
    ];

    const { lastFrame } = render(
      <DetailedMessagesDisplay
        messages={messages}
        maxHeight={20}
        width={80}
        hasFocus={true}
      />,
    );
    const output = lastFrame();

    expect(output).not.toContain(SCREEN_READER_INFO);
    expect(output).not.toContain(SCREEN_READER_WARNING);
    expect(output).not.toContain(SCREEN_READER_ERROR);
    expect(output).not.toContain(SCREEN_READER_DEBUG);
    expect(output).toContain('ℹ');
    expect(output).toContain('⚠');
    expect(output).toContain('✖');
    expect(output).toContain('🔍');
  });
});
