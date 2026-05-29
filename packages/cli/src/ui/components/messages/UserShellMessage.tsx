/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../../semantic-colors.js';
import { SCREEN_READER_SHELL_PREFIX } from '../../textConstants.js';

interface UserShellMessageProps {
  text: string;
}

export const UserShellMessage: React.FC<UserShellMessageProps> = ({ text }) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  // Remove leading '!' if present, as App.tsx adds it for the processor.
  const commandToDisplay = text.startsWith('!') ? text.substring(1) : text;

  const prefix = '$ ';
  const prefixWidth = isScreenReaderEnabled ? 11 : 2;

  return (
    <Box flexDirection="row" marginY={1}>
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.ui.symbol}>
          {isScreenReaderEnabled ? SCREEN_READER_SHELL_PREFIX : prefix}
        </Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={theme.text.primary} wrap="wrap">
          {commandToDisplay}
        </Text>
      </Box>
    </Box>
  );
};
