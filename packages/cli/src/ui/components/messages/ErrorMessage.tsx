/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../../semantic-colors.js';
import { ERROR_ICON, SCREEN_READER_ERROR } from '../../textConstants.js';

interface ErrorMessageProps {
  text: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ text }) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const icon = ERROR_ICON + ' ';
  const srPrefix = SCREEN_READER_ERROR;
  const prefixWidth = isScreenReaderEnabled ? srPrefix.length : icon.length;

  return (
    <Box flexDirection="row" marginBottom={1}>
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.status.error}>
          {isScreenReaderEnabled ? srPrefix : icon}
        </Text>
      </Box>
      <Box flexGrow={1}>
        <Text wrap="wrap" color={theme.status.error}>
          {text}
        </Text>
      </Box>
    </Box>
  );
};
