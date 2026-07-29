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

  const renderWarning = (message: string) => {
    const icon = WARNING_ICON + ' ';
    const srPrefix = SCREEN_READER_WARNING;
    const prefixWidth = isScreenReaderEnabled ? 11 : 3;

    return (
      <Box flexDirection="row" marginTop={1}>
        <Box width={prefixWidth} flexShrink={0}>
          <Text color={theme.status.warning}>
            {isScreenReaderEnabled ? srPrefix : icon}
          </Text>
        </Box>
        <Text color={theme.status.warning}>{message}</Text>
      </Box>
    );
  };

  return (
    <>
      {uiState.dialogsVisible && uiState.ctrlCPressedOnce && (
        <>{renderWarning('Press Ctrl+C again to exit.')}</>
      )}

      {uiState.dialogsVisible && uiState.ctrlDPressedOnce && (
        <>{renderWarning('Press Ctrl+D again to exit.')}</>
      )}
    </>
  );
};
