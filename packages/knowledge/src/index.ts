// index.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Public exports for @vetassist/knowledge package

export { chromaClient } from './ChromaClient.js';
export { retrievalPipeline } from './RetrievalPipeline.js';
export { getSourceWeight, getSourceTypeWeight, SOURCE_WEIGHTS } from './SourceWeights.js';
export { createDefaultEmbeddingFunction } from './EmbeddingService.js';
export type { KnowledgeChunk, ChromaMetadata, RetrievalResult, KnowledgeSourceType } from './types.js';
