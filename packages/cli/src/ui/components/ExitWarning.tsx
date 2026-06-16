/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { useUIState } from '../contexts/UIStateContext.js';
import { theme } from '../semantic-colors.js';
import { WARNING_ICON, SCREEN_READER_WARNING } from '../textConstants.js';

export const ExitWarning: React.FC = () => {
  const uiState = useUIState();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const prefixWidth = isScreenReaderEnabled ? 11 : 3;

  return (
    <>
      {uiState.dialogsVisible && uiState.ctrlCPressedOnce && (
        <Box marginTop={1} flexDirection="row">
          <Box width={prefixWidth} flexShrink={0}>
            <Text color={theme.status.warning}>
              {isScreenReaderEnabled ? SCREEN_READER_WARNING : WARNING_ICON}
            </Text>
          </Box>
          <Text color={theme.status.warning}>Press Ctrl+C again to exit.</Text>
        </Box>
      )}

      {uiState.dialogsVisible && uiState.ctrlDPressedOnce && (
        <Box marginTop={1} flexDirection="row">
          <Box width={prefixWidth} flexShrink={0}>
            <Text color={theme.status.warning}>
              {isScreenReaderEnabled ? SCREEN_READER_WARNING : WARNING_ICON}
            </Text>
          </Box>
          <Text color={theme.status.warning}>Press Ctrl+D again to exit.</Text>
        </Box>
      )}
    </>
  );
};
