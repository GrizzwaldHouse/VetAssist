// ChatHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Main chat handler — loads va_expert skill, retrieves RAG context, calls AI
import { ChatPipeline } from '../ChatPipeline.js';
// Prepends the va_expert skill prompt to retrieved RAG chunks so the AI has role context at top
async function handle(input, sanitizedText, deps) {
    const skillPrompt = await deps.promptLoader.load('va_expert');
    // Wrap the external contextFetcher (if provided) to prepend the skill prompt as the first chunk
    const contextChunksFetcher = async (query) => {
        const externalChunks = deps.contextFetcher ? await deps.contextFetcher(query) : [];
        return [skillPrompt, ...externalChunks];
    };
    return ChatPipeline.run(input, sanitizedText, {
        provider: deps.provider,
        contextChunksFetcher,
        skillId: 'va_expert',
    });
}
export const ChatHandler = { handle };
//# sourceMappingURL=ChatHandler.js.map