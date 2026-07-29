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

  const prefix = isScreenReaderEnabled ? SCREEN_READER_WARNING : WARNING_ICON + ' ';
  const prefixWidth = isScreenReaderEnabled ? 11 : 3;

  const renderWarning = (text: string) => (
    <Box marginTop={1} flexDirection="row">
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={theme.status.warning}>{prefix}</Text>
      </Box>
      <Text color={theme.status.warning}>{text}</Text>
    </Box>
  );

  return (
    <>
      {uiState.dialogsVisible &&
        uiState.ctrlCPressedOnce &&
        renderWarning('Press Ctrl+C again to exit.')}

      {uiState.dialogsVisible &&
        uiState.ctrlDPressedOnce &&
        renderWarning('Press Ctrl+D again to exit.')}
    </>
  );
};
