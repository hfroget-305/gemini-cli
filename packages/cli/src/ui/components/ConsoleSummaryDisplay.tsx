/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../semantic-colors.js';
import { ERROR_ICON, SCREEN_READER_ERROR } from '../textConstants.js';

interface ConsoleSummaryDisplayProps {
  errorCount: number;
}

export const ConsoleSummaryDisplay: React.FC<ConsoleSummaryDisplayProps> = ({
  errorCount,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  if (errorCount === 0) {
    return null;
  }

  const prefix = isScreenReaderEnabled ? SCREEN_READER_ERROR : `${ERROR_ICON} `;

  return (
    <Box>
      {errorCount > 0 && (
        <Text color={theme.status.error}>
          {prefix}
          {errorCount} error{errorCount > 1 ? 's' : ''}{' '}
          <Text color={theme.text.secondary}>(F12 for details)</Text>
        </Text>
      )}
    </Box>
  );
};
