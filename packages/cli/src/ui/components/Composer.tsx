/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import {
  WARNING_ICON,
  ERROR_ICON,
  SCREEN_READER_WARNING,
  SCREEN_READER_ERROR,
  SCREEN_READER_INFO,
} from '../textConstants.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { ContextSummaryDisplay } from './ContextSummaryDisplay.js';
import { AutoAcceptIndicator } from './AutoAcceptIndicator.js';
import { ShellModeIndicator } from './ShellModeIndicator.js';
import { DetailedMessagesDisplay } from './DetailedMessagesDisplay.js';
import { RawMarkdownIndicator } from './RawMarkdownIndicator.js';
import { InputPrompt } from './InputPrompt.js';
import { Footer } from './Footer.js';
import { ShowMoreLines } from './ShowMoreLines.js';
import { QueuedMessageDisplay } from './QueuedMessageDisplay.js';
import { OverflowProvider } from '../contexts/OverflowContext.js';
import { theme } from '../semantic-colors.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useVimMode } from '../contexts/VimModeContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useAlternateBuffer } from '../hooks/useAlternateBuffer.js';
import { ApprovalMode } from '@google/gemini-cli-core';
import { StreamingState } from '../types.js';
import { ConfigInitDisplay } from '../components/ConfigInitDisplay.js';
import { TodoTray } from './messages/Todo.js';

export const Composer = () => {
  const config = useConfig();
  const settings = useSettings();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const iconBoxWidth = isScreenReaderEnabled ? 11 : 3;
  const uiState = useUIState();
  const uiActions = useUIActions();
  const { vimEnabled } = useVimMode();
  const terminalWidth = process.stdout.columns;
  const isNarrow = isNarrowWidth(terminalWidth);
  const debugConsoleMaxHeight = Math.floor(Math.max(terminalWidth * 0.2, 5));
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const isAlternateBuffer = useAlternateBuffer();
  const { contextFileNames, showAutoAcceptIndicator } = uiState;
  const suggestionsPosition = isAlternateBuffer ? 'above' : 'below';
  const hideContextSummary =
    suggestionsVisible && suggestionsPosition === 'above';

  const renderTransientStatus = () => {
    const {
      ctrlCPressedOnce,
      warningMessage,
      ctrlDPressedOnce,
      showEscapePrompt,
      queueErrorMessage,
    } = uiState;

    if (
      !ctrlCPressedOnce &&
      !warningMessage &&
      !ctrlDPressedOnce &&
      !showEscapePrompt &&
      !queueErrorMessage
    ) {
      return null;
    }

    let color = theme.status.warning;
    let icon = WARNING_ICON;
    let srPrefix = SCREEN_READER_WARNING;
    let message = '';

    if (queueErrorMessage) {
      color = theme.status.error;
      icon = ERROR_ICON;
      srPrefix = SCREEN_READER_ERROR;
      message = queueErrorMessage;
    } else if (showEscapePrompt) {
      color = theme.text.secondary;
      icon = '';
      srPrefix = SCREEN_READER_INFO;
      message = 'Press Esc again to clear.';
    } else if (ctrlCPressedOnce) {
      message = 'Press Ctrl+C again to exit.';
    } else if (ctrlDPressedOnce) {
      message = 'Press Ctrl+D again to exit.';
    } else if (warningMessage) {
      message = warningMessage;
    }

    return (
      <Box flexDirection="row">
        <Box width={iconBoxWidth} flexShrink={0}>
          <Text color={color}>
            {isScreenReaderEnabled ? srPrefix : icon}
          </Text>
        </Box>
        <Text color={color}>{message}</Text>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      width={uiState.mainAreaWidth}
      flexGrow={0}
      flexShrink={0}
    >
      {!uiState.embeddedShellFocused && (
        <LoadingIndicator
          thought={
            uiState.streamingState === StreamingState.WaitingForConfirmation ||
            config.getAccessibility()?.disableLoadingPhrases
              ? undefined
              : uiState.thought
          }
          currentLoadingPhrase={
            config.getAccessibility()?.disableLoadingPhrases
              ? undefined
              : uiState.currentLoadingPhrase
          }
          elapsedTime={uiState.elapsedTime}
        />
      )}

      {(!uiState.slashCommands || !uiState.isConfigInitialized) && (
        <ConfigInitDisplay />
      )}

      <QueuedMessageDisplay messageQueue={uiState.messageQueue} />

      <TodoTray />

      <Box
        marginTop={1}
        justifyContent={
          settings.merged.ui?.hideContextSummary
            ? 'flex-start'
            : 'space-between'
        }
        width="100%"
        flexDirection={isNarrow ? 'column' : 'row'}
        alignItems={isNarrow ? 'flex-start' : 'center'}
      >
        <Box marginRight={1} flexDirection="row">
          {process.env['GEMINI_SYSTEM_MD'] && (
            <Text color={theme.status.error}>|⌐■_■| </Text>
          )}
          {uiState.ctrlCPressedOnce ||
          uiState.warningMessage ||
          uiState.ctrlDPressedOnce ||
          uiState.showEscapePrompt ||
          uiState.queueErrorMessage ? (
            renderTransientStatus()
          ) : (
            !settings.merged.ui?.hideContextSummary &&
            !hideContextSummary && (
              <ContextSummaryDisplay
                ideContext={uiState.ideContextState}
                geminiMdFileCount={uiState.geminiMdFileCount}
                contextFileNames={contextFileNames}
                mcpServers={config.getMcpClientManager()?.getMcpServers() ?? {}}
                blockedMcpServers={
                  config.getMcpClientManager()?.getBlockedMcpServers() ?? []
                }
              />
            )
          )}
        </Box>
        <Box paddingTop={isNarrow ? 1 : 0}>
          {showAutoAcceptIndicator !== ApprovalMode.DEFAULT &&
            !uiState.shellModeActive && (
              <AutoAcceptIndicator approvalMode={showAutoAcceptIndicator} />
            )}
          {uiState.shellModeActive && <ShellModeIndicator />}
          {!uiState.renderMarkdown && <RawMarkdownIndicator />}
        </Box>
      </Box>

      {uiState.showErrorDetails && (
        <OverflowProvider>
          <Box flexDirection="column">
            <DetailedMessagesDisplay
              messages={uiState.filteredConsoleMessages}
              maxHeight={
                uiState.constrainHeight ? debugConsoleMaxHeight : undefined
              }
              width={uiState.mainAreaWidth}
              hasFocus={uiState.showErrorDetails}
            />
            <ShowMoreLines constrainHeight={uiState.constrainHeight} />
          </Box>
        </OverflowProvider>
      )}

      {uiState.isInputActive && (
        <InputPrompt
          buffer={uiState.buffer}
          inputWidth={uiState.inputWidth}
          suggestionsWidth={uiState.suggestionsWidth}
          onSubmit={uiActions.handleFinalSubmit}
          userMessages={uiState.userMessages}
          setBannerVisible={uiActions.setBannerVisible}
          onClearScreen={uiActions.handleClearScreen}
          config={config}
          slashCommands={uiState.slashCommands || []}
          commandContext={uiState.commandContext}
          shellModeActive={uiState.shellModeActive}
          setShellModeActive={uiActions.setShellModeActive}
          approvalMode={showAutoAcceptIndicator}
          onEscapePromptChange={uiActions.onEscapePromptChange}
          focus={true}
          vimHandleInput={uiActions.vimHandleInput}
          isEmbeddedShellFocused={uiState.embeddedShellFocused}
          popAllMessages={uiActions.popAllMessages}
          placeholder={
            vimEnabled
              ? "  Press 'i' for INSERT mode and 'Esc' for NORMAL mode."
              : '  Type your message or @path/to/file'
          }
          setQueueErrorMessage={uiActions.setQueueErrorMessage}
          streamingState={uiState.streamingState}
          suggestionsPosition={suggestionsPosition}
          onSuggestionsVisibilityChange={setSuggestionsVisible}
        />
      )}

      {!settings.merged.ui?.hideFooter && !isScreenReaderEnabled && <Footer />}
    </Box>
  );
};
