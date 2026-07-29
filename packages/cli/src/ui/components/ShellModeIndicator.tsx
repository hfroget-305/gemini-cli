/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../semantic-colors.js';
import { INFO_ICON, SCREEN_READER_INFO } from '../textConstants.js';

export const ShellModeIndicator: React.FC = () => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const prefix = isScreenReaderEnabled ? SCREEN_READER_INFO : INFO_ICON + ' ';
  const prefixWidth = isScreenReaderEnabled ? 11 : 3;

  return (
    <Box flexDirection="row">
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.ui.symbol}>{prefix}</Text>
      </Box>
      <Text color={theme.ui.symbol}>
        shell mode enabled
        <Text color={theme.text.secondary}> (esc to disable)</Text>
      </Text>
    </Box>
  );
};
