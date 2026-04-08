/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { ERROR_ICON, SCREEN_READER_ERROR } from '../textConstants.js';

interface ConsoleSummaryDisplayProps {
  errorCount: number;
  // logCount is not currently in the plan to be displayed in summary
}

export const ConsoleSummaryDisplay: React.FC<ConsoleSummaryDisplayProps> = ({
  errorCount,
}) => {
  if (errorCount === 0) {
    return null;
  }

  return (
    <Box
      aria-label={`${SCREEN_READER_ERROR}${errorCount} error${
        errorCount !== 1 ? 's' : ''
      }`}
    >
      {errorCount > 0 && (
        <Text color={theme.status.error}>
          {ERROR_ICON} {errorCount} error{errorCount !== 1 ? 's' : ''}{' '}
          <Text color={theme.text.secondary}>(F12 for details)</Text>
        </Text>
      )}
    </Box>
  );
};
