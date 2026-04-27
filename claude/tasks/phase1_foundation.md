# Phase 1 — Foundation
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Core architecture, AI chat, PII guard, basic document review

---

## GOAL
Build the functional foundation: monorepo scaffold, shared packages, API server, AI chat with CFR knowledge, PII scrubber on all inputs, basic document review scoring, and accessibility controls.

## PREREQUISITES
- Read: CLAUDE.md (full), va_expert.md, pii_guard.md, compliance_guard.md, accessibility skill
- Install: Node.js 20+, PostgreSQL, Turborepo

## TASKS (Execute in order)

### 1.1 Monorepo Scaffold
- Initialize Turborepo with apps/ and packages/ structure per CLAUDE.md
- Create package.json files for all packages with correct internal dependencies
- Set up TypeScript config (strict mode) with path aliases
- Create turbo.json with build/test/lint pipeline
- Verify: `turbo build` completes without errors

### 1.2 Shared Types Package
- Define all TypeScript interfaces: Document, Benefit, CommunityPost, ComplianceCheck, PIIDetectionEvent, DocumentSuggestion, ScoreResult
- Export from packages/shared-types
- Verify: Types import correctly in all consuming packages

### 1.3 PII Scrubber (CRITICAL — build first)
- Implement client-side regex patterns in packages/shared-utils/pii-detector.ts
- SSN patterns (all variants), credit card (Luhn), VA file numbers
- Action handlers: block (text input), redact (documents), strip (AI pre-processor)
- Audit event logging (type + timestamp, NEVER the actual PII)
- Write tests: 20+ test cases covering all SSN formats, edge cases (phone numbers that look like SSNs), and false positive prevention
- Verify: All tests pass, no false positives on common number patterns

### 1.4 Compliance Engine
- Implement as event-driven middleware in packages/ai-engine/compliance-checker.ts
- Crisis detection (keyword + sentiment), medical advice detection, legal advice detection, outcome guarantee detection, confidence scoring
- Event flow: AI_RESPONSE_GENERATED → all checks → COMPLIANCE_PASSED or COMPLIANCE_FAILED
- Write tests: test each check independently with positive and negative examples
- Verify: Crisis detection catches "I don't see the point anymore" but not "I don't see the point in filing online"

### 1.5 API Server
- Initialize Fastify server in apps/api
- Set up routes: /chat, /documents/review, /documents/generate, /health
- PII scrubber as middleware on ALL incoming requests
- Auth middleware (Auth0 integration placeholder)
- CORS, rate limiting, request validation (Zod schemas)
- Verify: Server starts, health endpoint returns 200

### 1.6 AI Chat Handler
- Implement RAG pipeline: load va_expert.md prompt, query Chroma vector store, assemble context, call Claude API
- Response passes through Compliance Engine before return
- Citations formatted as tappable chips in the response
- Suggested follow-up questions generated based on conversation context
- Verify: Chat returns cited responses, compliance engine catches test violations

### 1.7 Next.js Web App (Basic)
- Initialize Next.js app with App Router in apps/web
- Install Tailwind CSS + shadcn/ui
- Build layout: persistent crisis line banner, navigation, accessibility FAB
- Build chat page: message list, text input with PII scanner, voice input button, AI disclosure banner
- Build settings page: font size slider, dark mode, high contrast, TTS settings
- Verify: App renders, chat sends messages, PII scanner catches test SSN

### 1.8 Core UI Components
- CrisisLineBanner (persistent, non-dismissable, tappable to call)
- PIIWarningModal (triggered on PII detection)
- AIDisclosureBanner (persistent on all AI screens)
- AccessibilityControls (floating FAB with font size, contrast, dark mode)
- ScoreRing (animated percentage ring with color gradient)
- Verify: All components render correctly, accessibility audit passes

## COMPLETION CRITERIA
- [x] `turbo build` succeeds across all 13 packages — completed 2026-04-21
- [x] PII scrubber tests pass (22/22 cases) — completed 2026-04-21
- [x] Compliance engine tests pass (15/15 cases) — completed 2026-04-21
- [x] Chat endpoint returns cited responses — `/api/chat` wired through RAG + compliance
- [x] Web app renders with crisis banner, chat, and accessibility controls — completed 2026-04-21
- [x] No hardcoded values — all config from `packages/shared-config`
- [x] All files have proper headers (filename, developer, date, purpose)

## PHASE 1 STATUS: COMPLETE — 2026-04-21

### What was built
- 13 packages: shared-types, shared-config, shared-utils, events, pii, crisis, legal, compliance, ai, knowledge, ui-components, api, web
- PII detection: SSN (3 formats), VA file number, DOB, credit card (Luhn) — client-side regex + event emission
- Compliance engine: 6 checks — crisis, medical advice, exaggeration, PII in response, legal boundary, outcome guarantee
- Crisis detector: high/medium confidence phrases, 0.7 threshold, Veterans Crisis Line response text
- Legal boundary engine: directive, eligibility, outcome guarantee detection + rewriting + VSO referral
- Event bus: typed pub/sub, 10 event types, concurrent handler execution
- API server: Fastify on :3001, `/api/chat` + `/api/documents/review` + `/health`, rate limiting, CORS, Zod validation
- RAG wired: `retrievalPipeline.retrieveContext` injected as `contextChunksFetcher` in chat route — context now flows on every request
- Document review route: PII gate (`document_upload` location) + crisis check + `DocumentReviewHandler` CFR scoring
- Web app: Next.js 14 App Router — layout, home, `/chat`, `/settings`, `/documents` pages
- API client: 7 methods — `sendChat`, `reviewDocument`, `uploadDocument`, `searchBenefits`, `getHiddenGems`, `getBenefitById`, `checkEligibility`
- UI components: CrisisLineBanner, PIIWarningModal, AIDisclosureBanner, AccessibilityControls, ScoreRing, DocumentDropZone, NavSidebar, HomeHero

### Key files
- `packages/pii/src/PIIDetector.ts` — detect + redact + emit
- `packages/compliance/src/ComplianceEngine.ts` — 6-check gate on all AI responses
- `packages/crisis/src/CrisisDetector.ts` — confidence-scored crisis detection
- `packages/legal/src/LegalBoundaryEngine.ts` — directive/guarantee/eligibility detection
- `packages/ai/src/ChatPipeline.ts` — RAG → Claude → compliance → response (contextChunksFetcher injected at route layer)
- `packages/knowledge/src/RetrievalPipeline.ts` — weighted semantic retrieval with source authority + recency scoring
- `apps/api/src/routes/chat.ts` — `/api/chat` with RAG wired via `retrievalPipeline.retrieveContext`
- `apps/api/src/routes/documents.ts` — `/api/documents/review` with PII gate + crisis check + scoring
- `apps/api/src/server.ts` — Fastify server with both route plugins registered
- `apps/web/src/app/chat/page.tsx` — chat UI with PII modal + crisis overlay
- `apps/web/src/app/documents/page.tsx` — document review UI with ScoreRing + category breakdown + suggestions
- `apps/web/src/lib/apiClient.ts` — typed API client (7 methods incl. Phase 2 benefits + upload methods)
- `tests/pii-scrubber.test.ts` — 22 test cases
- `tests/compliance-engine.test.ts` — 15 test cases
