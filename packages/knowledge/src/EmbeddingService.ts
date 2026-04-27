// EmbeddingService.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Text embedding generation for Chroma ingestion — default embedding or custom

import type { IEmbeddingFunction } from 'chromadb';

// Returning undefined lets Chroma use its own default embedding function (all-MiniLM-L6-v2)
// Swap to a custom implementation (Anthropic, OpenAI, etc.) by injecting a different EmbeddingFunction
export function createDefaultEmbeddingFunction(): IEmbeddingFunction | undefined {
  return undefined;
}

// Custom embedding function interface for dependency injection — allows swapping providers
export interface EmbeddingFunction {
  generate(texts: readonly string[]): Promise<readonly number[][]>;
}
