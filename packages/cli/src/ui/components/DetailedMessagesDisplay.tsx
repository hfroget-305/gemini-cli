/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback } from 'react';
import type React from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { theme } from '../semantic-colors.js';
import type { ConsoleMessageItem } from '../types.js';
import {
  ScrollableList,
  type ScrollableListRef,
} from './shared/ScrollableList.js';
import {
  INFO_ICON,
  WARNING_ICON,
  ERROR_ICON,
  DEBUG_ICON,
  SCREEN_READER_INFO,
  SCREEN_READER_WARNING,
  SCREEN_READER_ERROR,
  SCREEN_READER_DEBUG,
} from '../textConstants.js';

interface DetailedMessagesDisplayProps {
  messages: ConsoleMessageItem[];
  maxHeight: number | undefined;
  width: number;
  hasFocus: boolean;
}

export const DetailedMessagesDisplay: React.FC<
  DetailedMessagesDisplayProps
> = ({ messages, maxHeight, width, hasFocus }) => {
  const scrollableListRef = useRef<ScrollableListRef<ConsoleMessageItem>>(null);
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  const borderAndPadding = 3;
  const iconBoxWidth = isScreenReaderEnabled ? 11 : 3;

  const estimatedItemHeight = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) return 1;
      const textWidth = width - borderAndPadding - iconBoxWidth;
      if (textWidth <= 0) return 1;
      return Math.max(1, Math.ceil((msg.content?.length || 1) / textWidth));
    },
    [width, messages, iconBoxWidth],
  );

  if (messages.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle="round"
      borderColor={theme.border.default}
      paddingLeft={1}
      width={width}
      height={maxHeight}
      flexShrink={0}
      flexGrow={0}
      overflow="hidden"
    >
      <Box marginBottom={1}>
        <Text bold color={theme.text.primary}>
          Debug Console <Text color={theme.text.secondary}>(F12 to close)</Text>
        </Text>
      </Box>
      <Box height={maxHeight} width={width - borderAndPadding}>
        <ScrollableList
          ref={scrollableListRef}
          data={messages}
          renderItem={({ item: msg }: { item: ConsoleMessageItem }) => {
            let textColor = theme.text.primary;
            let icon = INFO_ICON;
            let screenReaderPrefix = SCREEN_READER_INFO;

            switch (msg.type) {
              case 'warn':
                textColor = theme.status.warning;
                icon = WARNING_ICON;
                screenReaderPrefix = SCREEN_READER_WARNING;
                break;
              case 'error':
                textColor = theme.status.error;
                icon = ERROR_ICON;
                screenReaderPrefix = SCREEN_READER_ERROR;
                break;
              case 'debug':
                textColor = theme.text.secondary;
                icon = DEBUG_ICON;
                screenReaderPrefix = SCREEN_READER_DEBUG;
                break;
              default:
                break;
            }

            const prefix = isScreenReaderEnabled ? screenReaderPrefix : icon;

            return (
              <Box flexDirection="row">
                <Box minWidth={iconBoxWidth} flexShrink={0}>
                  <Text color={textColor}>{prefix}</Text>
                </Box>
                <Text color={textColor} wrap="wrap">
                  {msg.content}
                  {msg.count && msg.count > 1 && (
                    <Text color={theme.text.secondary}> (x{msg.count})</Text>
                  )}
                </Text>
              </Box>
            );
          }}
          keyExtractor={(item, index) => `${item.content}-${index}`}
          estimatedItemHeight={estimatedItemHeight}
          hasFocus={hasFocus}
          initialScrollIndex={Number.MAX_SAFE_INTEGER}
        />
      </Box>
    </Box>
  );
};
