// useChat.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: React hook for chat state — manages messages, loading, PII detection, crisis state

'use client';

import { useState, useCallback, useRef } from 'react';
import { RegexUtils, LuhnValidator } from '@vetassist/shared-utils';
import { apiClient, type ChatApiResponse, ApiError } from '../lib/apiClient.js';

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly citations: readonly string[];
  readonly isCrisis: boolean;
  readonly timestamp: string;
}

export interface UseChatReturn {
  readonly messages: readonly ChatMessage[];
  readonly isLoading: boolean;
  readonly hasPIIWarning: boolean;
  readonly isCrisisActive: boolean;
  readonly error: string | null;
  readonly sendMessage: (text: string) => Promise<void>;
  readonly dismissPIIWarning: () => void;
  readonly sessionId: string | null;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// Client-side PII pre-check before sending to API
function hasLocalPII(text: string): boolean {
  RegexUtils.SSN_DASHED.lastIndex = 0;
  RegexUtils.SSN_SPACED.lastIndex = 0;
  RegexUtils.SSN_CONSECUTIVE.lastIndex = 0;
  RegexUtils.VA_FILE_NUMBER.lastIndex = 0;

  const hasSsn =
    RegexUtils.SSN_DASHED.test(text) ||
    RegexUtils.SSN_SPACED.test(text) ||
    RegexUtils.SSN_CONSECUTIVE.test(text);

  const hasVaFile = RegexUtils.VA_FILE_NUMBER.test(text);
  const hasCreditCard = LuhnValidator.findCreditCards(text).length > 0;

  // Reset lastIndex after all tests
  RegexUtils.SSN_DASHED.lastIndex = 0;
  RegexUtils.SSN_SPACED.lastIndex = 0;
  RegexUtils.SSN_CONSECUTIVE.lastIndex = 0;
  RegexUtils.VA_FILE_NUMBER.lastIndex = 0;

  return hasSsn || hasVaFile || hasCreditCard;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPIIWarning, setHasPIIWarning] = useState(false);
  const [isCrisisActive, setIsCrisisActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    setError(null);

    // Client-side PII gate — blocks before network
    if (hasLocalPII(text)) {
      setHasPIIWarning(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      text,
      citations: [],
      isCrisis: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response: ChatApiResponse = await apiClient.sendChat({
        text,
        sessionId: sessionIdRef.current ?? undefined,
      });

      sessionIdRef.current = response.sessionId;

      if (response.isCrisis) {
        setIsCrisisActive(true);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        text: response.text,
        citations: response.citations,
        isCrisis: response.isCrisis,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismissPIIWarning = useCallback(() => setHasPIIWarning(false), []);

  return {
    messages,
    isLoading,
    hasPIIWarning,
    isCrisisActive,
    error,
    sendMessage,
    dismissPIIWarning,
    sessionId: sessionIdRef.current,
  };
}
