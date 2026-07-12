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
  width: number;
}

export const UserShellMessage: React.FC<UserShellMessageProps> = ({
  text,
  width,
}) => {
  // Remove leading '!' if present, as App.tsx adds it for the processor.
  const commandToDisplay = text.startsWith('!') ? text.substring(1) : text;
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  const prefixWidth = isScreenReaderEnabled
    ? SCREEN_READER_PREFIX_WIDTH
    : VISUAL_PREFIX_WIDTH;

  return (
    <Box flexDirection="row" width={width}>
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.ui.symbol}>
          {isScreenReaderEnabled ? SCREEN_READER_SHELL_PREFIX : '$ '}
        </Text>
      </Box>
      <Text color={theme.text.primary} wrap="wrap">
        {commandToDisplay}
      </Text>
    </Box>
  );
};
