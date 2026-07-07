/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../../semantic-colors.js';
import {
  SCREEN_READER_SHELL_PREFIX,
  VISUAL_PREFIX_WIDTH,
  SCREEN_READER_PREFIX_WIDTH,
} from '../../textConstants.js';

interface UserShellMessageProps {
  text: string;
  width?: number;
}

export const UserShellMessage: React.FC<UserShellMessageProps> = ({
  text,
  width,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  // Remove leading '!' if present, as App.tsx adds it for the processor.
  const commandToDisplay = text.startsWith('!') ? text.substring(1) : text;

  const prefix = isScreenReaderEnabled ? SCREEN_READER_SHELL_PREFIX : '$ ';
  const prefixWidth = isScreenReaderEnabled
    ? SCREEN_READER_PREFIX_WIDTH
    : VISUAL_PREFIX_WIDTH;

  return (
    <Box flexDirection="row" width={width}>
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.ui.symbol}>{prefix}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={theme.text.primary} wrap="wrap">
          {commandToDisplay}
        </Text>
      </Box>
    </Box>
  );
};
