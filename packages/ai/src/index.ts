// index.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Public exports for @vetassist/ai package

export { ChatPipeline } from './ChatPipeline.js';
export { createProvider, MockAIProvider, ClaudeProvider } from './AIProvider.js';
export type { AIProvider } from './AIProvider.js';
export type { ChatPipelineResult, ChatPipelineDependencies } from './ChatPipeline.js';
export { createPromptLoader } from './PromptLoader.js';
export { RequestClassifier } from './RequestClassifier.js';
export { ChatHandler } from './handlers/ChatHandler.js';
export { DecisionLetterHandler } from './handlers/DecisionLetterHandler.js';
export { DocumentReviewHandler } from './handlers/DocumentReviewHandler.js';
export { InlineDiffHandler } from './handlers/InlineDiffHandler.js';
export { DocumentWriterHandler } from './handlers/DocumentWriterHandler.js';
export { SharingService } from './SharingService.js';
export { StoryBuilderHandler } from './handlers/StoryBuilderHandler.js';
export { DataDestructionService } from './DataDestructionService.js';
export type { DocumentStore } from './DataDestructionService.js';
export type { PromptLoader } from './PromptLoader.js';
