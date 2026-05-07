/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../../test-utils/render.js';
import { UserMessage } from './UserMessage.js';
import { describe, it, expect, vi } from 'vitest';
import { useIsScreenReaderEnabled } from 'ink';

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  return {
    ...actual,
    useIsScreenReaderEnabled: vi.fn(),
  };
});

// Mock the commandUtils to control isSlashCommand behavior
vi.mock('../../utils/commandUtils.js', () => ({
  isSlashCommand: vi.fn((text: string) => text.startsWith('/')),
}));

describe('UserMessage', () => {
  it('renders normal user message with correct prefix', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(
      <UserMessage text="Hello Gemini" width={80} />,
    );
    const output = lastFrame();

    expect(output).toMatchSnapshot();
  });

  it('renders with screen reader prefix when enabled', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(true);
    const { lastFrame } = render(
      <UserMessage text="Hello Gemini" width={80} />,
    );
    const output = lastFrame();

    expect(output).toContain('User: Hello Gemini');
    expect(output).not.toContain('>');
  });

  it('renders slash command message', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const { lastFrame } = render(<UserMessage text="/help" width={80} />);
    const output = lastFrame();

    expect(output).toMatchSnapshot();
  });

  it('renders multiline user message', () => {
    vi.mocked(useIsScreenReaderEnabled).mockReturnValue(false);
    const message = 'Line 1\nLine 2';
    const { lastFrame } = render(<UserMessage text={message} width={80} />);
    const output = lastFrame();

    expect(output).toMatchSnapshot();
  });
});
