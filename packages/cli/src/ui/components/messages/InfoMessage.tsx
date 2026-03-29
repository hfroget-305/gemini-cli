/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../../semantic-colors.js';
import { RenderInline } from '../../utils/InlineMarkdownRenderer.js';
import { INFO_ICON, SCREEN_READER_INFO } from '../../textConstants.js';

interface InfoMessageProps {
  text: string;
  icon?: string;
  color?: string;
}

export const InfoMessage: React.FC<InfoMessageProps> = ({
  text,
  icon,
  color,
}) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  color ??= theme.status.warning;

  let prefix: string;
  let prefixWidth: number;

  if (isScreenReaderEnabled) {
    prefix = icon ? `[${icon}] ` : SCREEN_READER_INFO;
    prefixWidth = 11;
  } else {
    prefix = icon ? `${icon} ` : `${INFO_ICON} `;
    prefixWidth = Math.max(3, prefix.length);
  }

  return (
    <Box flexDirection="row" marginTop={1}>
      <Box width={prefixWidth} flexShrink={0}>
        <Text color={color}>{prefix}</Text>
      </Box>
      <Box flexGrow={1} flexDirection="column">
        {text.split('\n').map((line, index) => (
          <Text wrap="wrap" key={index}>
            <RenderInline text={line} defaultColor={color} />
          </Text>
        ))}
      </Box>
    </Box>
  );
};
