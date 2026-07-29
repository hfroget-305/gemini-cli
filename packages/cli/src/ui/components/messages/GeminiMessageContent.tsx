/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, useIsScreenReaderEnabled } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { useUIState } from '../../contexts/UIStateContext.js';
import { useAlternateBuffer } from '../../hooks/useAlternateBuffer.js';
import { SCREEN_READER_MODEL_PREFIX } from '../../textConstants.js';

interface GeminiMessageContentProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

/*
 * Gemini message content is a semi-hacked component. The intention is to represent a partial
 * of GeminiMessage and is only used when a response gets too long. In that instance messages
 * are split into multiple GeminiMessageContent's to enable the root <Static> component in
 * App.tsx to be as performant as humanly possible.
 */
export const GeminiMessageContent: React.FC<GeminiMessageContentProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const { renderMarkdown } = useUIState();
  const isAlternateBuffer = useAlternateBuffer();
  const originalPrefix = isScreenReaderEnabled ? SCREEN_READER_MODEL_PREFIX : '✦ ';
  const prefixWidth = originalPrefix.length;

  return (
    <Box flexDirection="column" paddingLeft={prefixWidth}>
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
  );
};
