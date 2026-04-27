// types.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: TypeScript interfaces for the knowledge base layer — chunks, metadata, and retrieval results

export type KnowledgeSourceType = 'official' | 'verified' | 'community';

export interface KnowledgeChunk {
  readonly id: string;
  readonly source: string;
  readonly sourceType: KnowledgeSourceType;
  readonly text: string;
  readonly cfrSection: string | null;
  readonly keywords: readonly string[];
  readonly weight: number;
  readonly part: string | null;
  readonly section: string | null;
  readonly subsection: string | null;
  readonly heading: string | null;
  readonly fetchedAt: string;
  readonly expiresAt: string;
  readonly tokenCount: number;
  readonly version: string;
  readonly supersededBy: string | null;
  readonly citationFrequency: number;
  readonly lastRetrievedAt: string | null;
}

export interface ChromaMetadata {
  readonly source: string;
  readonly sourceType: KnowledgeSourceType;
  readonly cfrSection: string;
  readonly weight: number;
  readonly part: string;
  readonly version: string;
  readonly expiresAt: string;
}

export interface RetrievalResult {
  readonly chunk: KnowledgeChunk;
  readonly distance: number;
  readonly finalScore: number;
  readonly retrievalRank: number;
}
