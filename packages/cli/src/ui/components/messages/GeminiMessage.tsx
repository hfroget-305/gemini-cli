/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { theme } from '../../semantic-colors.js';
import {
  SCREEN_READER_MODEL_PREFIX,
  VISUAL_PREFIX_WIDTH,
  SCREEN_READER_PREFIX_WIDTH,
} from '../../textConstants.js';
import { useUIState } from '../../contexts/UIStateContext.js';
import { useAlternateBuffer } from '../../hooks/useAlternateBuffer.js';

interface GeminiMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const GeminiMessage: React.FC<GeminiMessageProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const { renderMarkdown } = useUIState();
  const prefix = '✦ ';
  const srPrefix = SCREEN_READER_MODEL_PREFIX;
  const prefixWidth = isScreenReaderEnabled
    ? SCREEN_READER_PREFIX_WIDTH
    : VISUAL_PREFIX_WIDTH;

  const isAlternateBuffer = useAlternateBuffer();
  return (
    <Box flexDirection="row">
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.text.accent}>
          {isScreenReaderEnabled ? srPrefix : prefix}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column">
        <MarkdownDisplay
          text={text}
          isPending={isPending}
          availableTerminalHeight={
            isAlternateBuffer ? undefined : availableTerminalHeight
          }
          terminalWidth={terminalWidth}
          renderMarkdown={renderMarkdown}
        />
      </Box>
    </Box>
  );
};
