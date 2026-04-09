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
import { SCREEN_READER_PREFIXES } from '../textConstants.js';
import {
  ScrollableList,
  type ScrollableListRef,
} from './shared/ScrollableList.js';

interface DetailedMessagesDisplayProps {
  messages: ConsoleMessageItem[];
  maxHeight: number | undefined;
  width: number;
  hasFocus: boolean;
}

export const DetailedMessagesDisplay: React.FC<
  DetailedMessagesDisplayProps
> = ({ messages, maxHeight, width, hasFocus }) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const scrollableListRef = useRef<ScrollableListRef<ConsoleMessageItem>>(null);

  const borderAndPadding = 3;

  const estimatedItemHeight = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) {
        return 1;
      }

      const prefixWidth = isScreenReaderEnabled
        ? SCREEN_READER_PREFIXES[msg.type || 'log'].length
        : 3;

      const textWidth = width - borderAndPadding - prefixWidth;
      if (textWidth <= 0) {
        return 1;
      }
      const lines = Math.ceil((msg.content?.length || 1) / textWidth);
      return Math.max(1, lines);
    },
    [width, messages, isScreenReaderEnabled],
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
            let iconOrPrefix: string = 'ℹ'; // Information source (ℹ)

            switch (msg.type) {
              case 'warn':
                textColor = theme.status.warning;
                iconOrPrefix = isScreenReaderEnabled
                  ? SCREEN_READER_PREFIXES.warn
                  : '⚠';
                break;
              case 'error':
                textColor = theme.status.error;
                iconOrPrefix = isScreenReaderEnabled
                  ? SCREEN_READER_PREFIXES.error
                  : '✖';
                break;
              case 'debug':
                textColor = theme.text.secondary;
                iconOrPrefix = isScreenReaderEnabled
                  ? SCREEN_READER_PREFIXES.debug
                  : '🔍';
                break;
              case 'log':
              default:
                iconOrPrefix = isScreenReaderEnabled
                  ? SCREEN_READER_PREFIXES.log
                  : 'ℹ';
                break;
            }

            return (
              <Box flexDirection="row">
                <Box minWidth={isScreenReaderEnabled ? 0 : 3} flexShrink={0}>
                  <Text color={textColor}>{iconOrPrefix}</Text>
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
