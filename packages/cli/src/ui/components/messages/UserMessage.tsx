/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../../semantic-colors.js';
import {
  SCREEN_READER_USER_PREFIX,
  SCREEN_READER_PREFIX_WIDTH,
  VISUAL_PREFIX_WIDTH,
} from '../../textConstants.js';
import { isSlashCommand as checkIsSlashCommand } from '../../utils/commandUtils.js';

interface UserMessageProps {
  text: string;
  width: number;
}

export const UserMessage: React.FC<UserMessageProps> = ({ text, width }) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const prefix = isScreenReaderEnabled ? SCREEN_READER_USER_PREFIX : '> ';
  const prefixWidth = isScreenReaderEnabled
    ? SCREEN_READER_PREFIX_WIDTH
    : VISUAL_PREFIX_WIDTH;
  const isSlashCommand = checkIsSlashCommand(text);

  const textColor = isSlashCommand ? theme.text.accent : theme.text.secondary;

  return (
    <Box
      flexDirection="row"
      paddingY={0}
      marginY={1}
      alignSelf="flex-start"
      width={width}
    >
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.text.accent}>{prefix}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text wrap="wrap" color={textColor}>
          {text}
        </Text>
      </Box>
    </Box>
  );
};
