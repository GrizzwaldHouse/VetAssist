// ChatPipeline.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: End-to-end chat pipeline — sanitize → AI → legal → compliance → RESPONSE_READY

import { randomUUID } from 'crypto';
import type { AIRequest, AIResponse, UserInput } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { ComplianceEngine } from '@vetassist/compliance';
import { LegalBoundaryEngine } from '@vetassist/legal';
import { MODELS } from '@vetassist/shared-config';
import type { AIProvider } from './AIProvider.js';

export interface ChatPipelineResult {
  readonly sessionId: string;
  readonly responseText: string;
  readonly citations: readonly string[];
  readonly compliancePassed: boolean;
}

export interface ChatPipelineDependencies {
  readonly provider: AIProvider;
  readonly contextChunksFetcher?: (sanitizedText: string) => Promise<readonly string[]>;
  readonly skillId?: string;
  // Optional — when present, state-specific compliance rules are applied after the base 6 checks
  readonly userState?: string;
}

// Dependency-injected pipeline — no hardcoded provider or context fetcher
async function run(
  input: UserInput,
  sanitizedText: string,
  deps: ChatPipelineDependencies,
): Promise<ChatPipelineResult> {
  const contextChunks = deps.contextChunksFetcher
    ? await deps.contextChunksFetcher(sanitizedText)
    : [];

  const request: AIRequest = {
    sessionId: input.sessionId,
    sanitizedText,
    contextChunks,
    skillId: deps.skillId ?? 'va_expert',
    model: MODELS.reasoning,
    timestamp: new Date().toISOString(),
  };

  await eventBus.emit(EVENTS.AI_REQUEST_STARTED, request);

  const rawResponse: AIResponse = await deps.provider.complete(request);

  await eventBus.emit(EVENTS.AI_RESPONSE_RECEIVED, rawResponse);

  // Legal boundary pass — rewrites directives and appends VSO referral if needed
  const legalResult = await LegalBoundaryEngine.enforceAndEmit(rawResponse);

  // Build a response object with the legally-modified text for compliance evaluation
  const legallyModifiedResponse: AIResponse = {
    ...rawResponse,
    text: legalResult.modifiedText,
  };

  // Compliance gate — mandatory, always runs; passes userState for state-specific rule application
  const complianceResult = await ComplianceEngine.evaluateWithContextAndEmit(
    legallyModifiedResponse,
    deps.userState,
  );

  const finalText = complianceResult.modifiedText;
  const citations = rawResponse.citations;

  // Only emit RESPONSE_READY when compliance fully passed — subscribers must not receive blocked responses
  if (complianceResult.passed) {
    await eventBus.emit(EVENTS.RESPONSE_READY, {
      sessionId: input.sessionId,
      text: finalText,
      citations,
    });
  }

  return {
    sessionId: input.sessionId,
    responseText: finalText,
    citations,
    compliancePassed: complianceResult.passed,
  };
}

export const ChatPipeline = { run } as const;
