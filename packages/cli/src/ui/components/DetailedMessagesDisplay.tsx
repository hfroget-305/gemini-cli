/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback, useMemo } from 'react';
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

  const getPrefix = useCallback(
    (type: ConsoleMessageItem['type']) => {
      if (isScreenReaderEnabled) {
        switch (type) {
          case 'warn':
            return SCREEN_READER_WARNING;
          case 'error':
            return SCREEN_READER_ERROR;
          case 'debug':
            return SCREEN_READER_DEBUG;
          case 'log':
          default:
            return SCREEN_READER_INFO;
        }
      } else {
        switch (type) {
          case 'warn':
            return `${WARNING_ICON} `;
          case 'error':
            return `${ERROR_ICON} `;
          case 'debug':
            return `${DEBUG_ICON} `;
          case 'log':
          default:
            return `${INFO_ICON} `;
        }
      }
    },
    [isScreenReaderEnabled],
  );

  const iconBoxWidth = useMemo(() => {
    if (!isScreenReaderEnabled) {
      return 3;
    }
    // Length of the longest screen reader prefix
    return Math.max(
      SCREEN_READER_INFO.length,
      SCREEN_READER_WARNING.length,
      SCREEN_READER_ERROR.length,
      SCREEN_READER_DEBUG.length,
    );
  }, [isScreenReaderEnabled]);

  const borderAndPadding = 3;

  const estimatedItemHeight = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) {
        return 1;
      }
      const textWidth = width - borderAndPadding - iconBoxWidth;
      if (textWidth <= 0) {
        return 1;
      }
      const lines = Math.ceil((msg.content?.length || 1) / textWidth);
      return Math.max(1, lines);
    },
    [width, messages, iconBoxWidth],
  );

  if (messages.length === 0) {
    return null;
  }

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
            const prefix = getPrefix(msg.type);

            switch (msg.type) {
              case 'warn':
                textColor = theme.status.warning;
                break;
              case 'error':
                textColor = theme.status.error;
                break;
              case 'debug':
                textColor = theme.text.secondary;
                break;
              case 'log':
              default:
                break;
            }

            return (
              <Box flexDirection="row">
                <Box width={iconBoxWidth} flexShrink={0}>
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
