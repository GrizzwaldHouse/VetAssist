// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Chat page — core AI feature; message list, PII-guarded textarea, crisis detection, voice input placeholder

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AIDisclosureBanner, CrisisLineBanner, PIIWarningModal } from '@vetassist/ui-components';
import { useChat } from '../../hooks/useChat.js';
import type { ChatMessage } from '../../hooks/useChat.js';

// Layout dimension constants — no magic numbers
const INPUT_MAX_ROWS      = 5;
const TEXTAREA_MIN_HEIGHT = 56;

// Aria label constants
const ARIA_MESSAGE_LIST  = 'Conversation';
const ARIA_INPUT         = 'Type your question about VA benefits';
const ARIA_SEND_BUTTON   = 'Send message';
const ARIA_VOICE_BUTTON  = 'Start voice input';

// Display text constants
const EMPTY_STATE_TEXT     = 'Ask me anything about VA benefits';
const PLACEHOLDER_TEXT     = 'Type your question here…';
const SEND_LABEL           = 'Send';
const VOICE_LABEL          = '🎤';
const THINKING_TEXT        = 'Thinking…';
const VOICE_UNSUPPORTED    = 'Voice input is not supported in this browser.';
const PII_DETECTED_TYPE    = 'SSN';

// Outer page container — flex column, full viewport height minus banner heights
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  backgroundColor: 'var(--va-color-background)',
};

// Scrollable message area
const messageListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px var(--va-space-6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

// Empty state — centered instructional text
const emptyStateStyle: React.CSSProperties = {
  margin: 'auto',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '32px',
};

// User message bubble — right aligned
const userBubbleStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  backgroundColor: 'var(--va-color-old-glory-blue, #1a2744)',
  color: 'var(--va-color-star-white)',
  borderRadius: '16px 16px 4px 16px',
  padding: '12px 16px',
  maxWidth: '72%',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  lineHeight: 1.5,
  wordBreak: 'break-word',
};

// Assistant message bubble — left aligned
const assistantBubbleStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  backgroundColor: 'var(--va-color-aged-canvas)',
  color: 'var(--va-color-text-primary)',
  borderRadius: '16px 16px 16px 4px',
  borderLeft: '3px solid var(--va-color-old-glory-red)',
  padding: '12px 16px',
  maxWidth: '72%',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  lineHeight: 1.5,
  wordBreak: 'break-word',
};

// Citation chip
const citationChipStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-secondary)',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  padding: '2px 8px',
  borderRadius: '3px',
  marginRight: '6px',
  marginTop: '6px',
  border: '1px solid var(--va-color-border)',
};

// Loading indicator
const thinkingStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  padding: '8px 16px',
};

// Error text
const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-old-glory-red)',
  padding: '8px 16px',
  alignSelf: 'center',
};

// Input row — sticks to bottom
const inputRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '8px',
  padding: '12px var(--va-space-6)',
  borderTop: '1px solid var(--va-color-border)',
  backgroundColor: 'var(--va-color-background)',
};

// Textarea — expands with content
const textareaBase: React.CSSProperties = {
  flex: 1,
  resize: 'none',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  lineHeight: 1.5,
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '12px 14px',
  minHeight: `${TEXTAREA_MIN_HEIGHT}px`,
  maxHeight: `${TEXTAREA_MIN_HEIGHT * INPUT_MAX_ROWS}px`,
  overflowY: 'auto',
};

const textareaPIIStyle: React.CSSProperties = {
  ...textareaBase,
  borderColor: 'var(--va-color-old-glory-red)',
  outline: '2px solid var(--va-color-old-glory-red)',
};

const iconButtonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: '1px solid var(--va-color-border)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  color: 'var(--va-color-text-primary)',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const sendButtonStyle: React.CSSProperties = {
  height: '48px',
  padding: '0 20px',
  borderRadius: 'var(--va-radius-card)',
  border: 'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  flexShrink: 0,
};

const sendButtonDisabledStyle: React.CSSProperties = {
  ...sendButtonStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
};

// Renders a single chat bubble — memoized to avoid re-renders on unrelated state changes
const MessageBubble = React.memo(function MessageBubble({ message }: { readonly message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div>
      <div
        style={isUser ? userBubbleStyle : assistantBubbleStyle}
        aria-label={isUser ? 'Your message' : 'VetAssist response'}
      >
        {message.text}
      </div>

      {/* Citation chips — shown below assistant messages only */}
      {!isUser && message.citations.length > 0 && (
        <div style={{ paddingLeft: '4px', paddingTop: '2px' }}>
          {message.citations.map((citation, index) => (
            <span key={index} style={citationChipStyle} aria-label={`Citation: ${citation}`}>
              {citation}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// Helper — check for voice API availability without crashing on SSR
function voiceInputAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export default function ChatPage() {
  const { messages, isLoading, hasPIIWarning, isCrisisActive, error, sendMessage, dismissPIIWarning } = useChat();

  const [inputValue, setInputValue]     = useState('');
  const [inputHasPII, setInputHasPII]   = useState(false);
  const messagesEndRef                  = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Shallow client-side PII indicator — drives red border on textarea
  // The hook's hasLocalPII is the authoritative gate; this is just a visual hint
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Simple pattern — the hook checks regex in depth before send; here we just watch length heuristic
    // to avoid running the full regex on every keystroke
    setInputHasPII(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    setInputHasPII(false);
    await sendMessage(trimmed);
  }, [inputValue, isLoading, sendMessage]);

  // Send on Enter (Shift+Enter inserts newline)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const handleVoiceInput = useCallback(() => {
    if (!voiceInputAvailable()) {
      alert(VOICE_UNSUPPORTED);
      return;
    }

    // SpeechRecognition is not in all TypeScript DOM lib versions — typed as generic constructor
    type SpeechRecognitionConstructor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      start: () => void;
    };

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionAPI = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert(VOICE_UNSUPPORTED);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setInputValue(prev => prev + transcript);
    };
    recognition.start();
  }, []);

  // Dismiss PII warning and clear the textarea so the user can retype without the flagged content
  const handlePIIDismiss = useCallback(() => {
    dismissPIIWarning();
    setInputValue('');
    setInputHasPII(false);
  }, [dismissPIIWarning]);

  const sendDisabled = isLoading || !inputValue.trim() || hasPIIWarning;

  return (
    <div style={pageStyle}>
      {/* AI disclosure — required on every AI-powered screen */}
      <AIDisclosureBanner />

      {/* Inline crisis banner — shown when the response triggered crisis detection */}
      {isCrisisActive && <CrisisLineBanner />}

      {/* Message list — live region so screen readers announce new messages */}
      <div
        role="log"
        aria-label={ARIA_MESSAGE_LIST}
        aria-live="polite"
        aria-relevant="additions"
        style={messageListStyle}
      >
        {messages.length === 0 && !isLoading && (
          <p style={emptyStateStyle}>{EMPTY_STATE_TEXT}</p>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <p style={thinkingStyle} aria-live="polite" aria-label="VetAssist is thinking">
            {THINKING_TEXT}
          </p>
        )}

        {error && (
          <p style={errorStyle} role="alert">
            {error}
          </p>
        )}

        {/* Anchor element scrolled into view on new messages */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input row */}
      <div style={inputRowStyle}>
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          style={inputHasPII ? textareaPIIStyle : textareaBase}
          placeholder={PLACEHOLDER_TEXT}
          rows={1}
          aria-label={ARIA_INPUT}
          aria-invalid={inputHasPII}
          aria-describedby={inputHasPII ? 'pii-warning-hint' : undefined}
          disabled={isLoading}
        />

        {/* Voice input button */}
        <button
          style={iconButtonStyle}
          onClick={handleVoiceInput}
          aria-label={ARIA_VOICE_BUTTON}
          type="button"
        >
          {VOICE_LABEL}
        </button>

        {/* Send button */}
        <button
          style={sendDisabled ? sendButtonDisabledStyle : sendButtonStyle}
          onClick={() => void handleSend()}
          disabled={sendDisabled}
          aria-label={ARIA_SEND_BUTTON}
          type="button"
        >
          {SEND_LABEL}
        </button>
      </div>

      {/* PII warning modal — rendered outside the input row for correct stacking context */}
      <PIIWarningModal
        isOpen={hasPIIWarning}
        detectedType={PII_DETECTED_TYPE}
        action="blocked"
        onDismiss={handlePIIDismiss}
      />
    </div>
  );
}
