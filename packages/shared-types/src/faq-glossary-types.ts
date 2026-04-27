// faq-glossary-types.ts
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: TypeScript interfaces for the FAQ, Glossary, and VA Workaround features

export type FAQCategory =
  | 'claims'
  | 'appeals'
  | 'benefits'
  | 'documents'
  | 'ratings'
  | 'eligibility'
  | 'va_website'
  | 'general';

export interface FAQEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: FAQCategory;
  readonly relatedCFR?: string;
  readonly upvotes: number;
  readonly sourceType: 'chatbot_derived' | 'manual';
}

export interface GlossaryTerm {
  readonly id: string;
  readonly term: string;
  readonly definition: string;
  readonly acronym?: string;
  readonly cfrLink?: string;
  readonly cfrCitation?: string;
  readonly relatedTerms?: readonly string[];
}

export interface VAWorkaround {
  readonly id: string;
  readonly issue: string;
  readonly symptom: string;
  readonly solution: string;
  readonly affectedPage?: string;
}

export interface FAQListResponse {
  readonly entries: readonly FAQEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface GlossaryListResponse {
  readonly terms: readonly GlossaryTerm[];
  readonly total: number;
}
