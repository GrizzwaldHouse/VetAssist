// ChatHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Main chat handler — loads va_expert skill, retrieves RAG context, calls AI

import type { UserInput } from '@vetassist/shared-types';
import { ChatPipeline } from '../ChatPipeline.js';
import type { ChatPipelineResult } from '../ChatPipeline.js';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';

interface ChatHandlerDependencies {
  readonly provider: AIProvider;
  readonly promptLoader: PromptLoader;
  readonly contextFetcher?: (query: string) => Promise<readonly string[]>;
}

// Prepends the va_expert skill prompt to retrieved RAG chunks so the AI has role context at top
async function handle(
  input: UserInput,
  sanitizedText: string,
  deps: ChatHandlerDependencies,
): Promise<ChatPipelineResult> {
  const skillPrompt = await deps.promptLoader.load('va_expert');

  // Wrap the external contextFetcher (if provided) to prepend the skill prompt as the first chunk
  const contextChunksFetcher = async (query: string): Promise<readonly string[]> => {
    const externalChunks = deps.contextFetcher ? await deps.contextFetcher(query) : [];
    return [skillPrompt, ...externalChunks];
  };

  return ChatPipeline.run(input, sanitizedText, {
    provider: deps.provider,
    contextChunksFetcher,
    skillId: 'va_expert',
  });
}

export const ChatHandler = { handle } as const;
