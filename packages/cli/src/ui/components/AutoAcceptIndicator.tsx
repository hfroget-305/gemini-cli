/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../semantic-colors.js';
import { ApprovalMode } from '@google/gemini-cli-core';
import {
  INFO_ICON,
  WARNING_ICON,
  SCREEN_READER_INFO,
  SCREEN_READER_WARNING,
} from '../textConstants.js';

interface AutoAcceptIndicatorProps {
  approvalMode: ApprovalMode;
}

export const AutoAcceptIndicator: React.FC<AutoAcceptIndicatorProps> = ({
  approvalMode,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  let textColor = '';
  let textContent = '';
  let subText = '';
  let icon = '';
  let srPrefix = '';

  switch (approvalMode) {
    case ApprovalMode.AUTO_EDIT:
      textColor = theme.status.warning;
      textContent = 'accepting edits';
      subText = ' (shift + tab to toggle)';
      icon = INFO_ICON + ' ';
      srPrefix = SCREEN_READER_INFO;
      break;
    case ApprovalMode.YOLO:
      textColor = theme.status.error;
      textContent = 'YOLO mode';
      subText = ' (ctrl + y to toggle)';
      icon = WARNING_ICON + ' ';
      srPrefix = SCREEN_READER_WARNING;
      break;
    case ApprovalMode.DEFAULT:
    default:
      break;
  }

  if (approvalMode === ApprovalMode.DEFAULT) {
    return null;
  }

  const prefix = isScreenReaderEnabled ? srPrefix : icon;
  const prefixWidth = isScreenReaderEnabled ? 11 : 3;

  return (
    <Box flexDirection="row">
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={textColor}>{prefix}</Text>
      </Box>
      <Text color={textColor}>
        {textContent}
        {subText && <Text color={theme.text.secondary}>{subText}</Text>}
      </Text>
    </Box>
  );
};
