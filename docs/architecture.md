# architecture.md
# Developer: Marcus Daley
# Date: 2026-04-26
# Purpose: System architecture reference — data flows, package boundaries, dependency rules

---

## System Overview

VetAssist is a Turborepo monorepo with three deployable apps (web, API, mobile) sharing 19 packages for types, safety, AI orchestration, domain logic, and UI components. 95% of logic lives in packages — never in apps.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        VETERAN (User)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Next.js Web  │  │ React Native │  │  PWA (Offline Cache) │  │
│  │  (14 pages)   │  │ (Phase 4)    │  │  (Phase 4)           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼────────────────────┼──────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT-SIDE SAFETY                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ PII Regex    │  │ Crisis Word  │  │ Input Validation    │   │
│  │ (Layer 1)    │  │ Pre-filter   │  │ (Zod Schemas)       │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │
└─────────┼────────────────┼──────────────────────┼──────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API LAYER (Fastify — 24 routes)                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Rate Limiter │  │ PII Middleware│  │ CORS + Auth (Ph.4) │   │
│  │              │  │ Presidio+HF  │  │                     │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │
│         │                │                      │              │
│         ▼                ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI ORCHESTRATION (packages/ai/)             │   │
│  │  ChatHandler · DocumentReviewHandler · InlineDiffHandler │   │
│  │  DocumentWriterHandler · DecisionLetterHandler           │   │
│  │  StoryBuilderHandler · RequestClassifier · SharingService│   │
│  │              ↓ RAG via ChromaDB (packages/knowledge/)    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │    COMPLIANCE ENGINE (packages/compliance/)      │    │   │
│  │  │  Crisis→Medical→Legal→PII→Exaggeration→Guarantee│    │   │
│  │  └─────────────────────┬───────────────────────────┘    │   │
│  └────────────────────────┼────────────────────────────────┘   │
│                           ▼                                    │
│  ┌────────────────┐  ┌─────────────┐  ┌───────────────────┐   │
│  │ PostgreSQL     │  │ Chroma      │  │ AES-256 File Store│   │
│  │ (Phase 4)      │  │ (RAG Vector)│  │ 24h auto-purge    │   │
│  └────────────────┘  └─────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Data Flow

Every user-submitted text follows this exact pipeline. Breaking any step is a critical safety violation.

```
USER INPUT (text / file upload)
  │
  ├─ Layer 1: Client-side PII regex
  │   packages/pii/src/PIIDetector.ts
  │   Detects: SSN, VA file #, DOB, credit card
  │   Action: blocks chat submission; redacts in document uploads
  │
  ├─ Layer 2: Server PII middleware
  │   apps/api/src/middleware/pii-scrubber.ts
  │   Tools: Microsoft Presidio + HF pii-entity-extractor
  │   Action: strips PII before text reaches AI layer
  │
  ├─ Layer 3: AI pre-processor strip
  │   packages/ai/src/ChatPipeline.ts
  │   Final PII sweep immediately before Claude API call
  │
  ├─ AI ORCHESTRATOR
  │   packages/ai/src/ChatPipeline.ts
  │   packages/ai/src/handlers/ (8 handlers)
  │   RAG retrieval via packages/knowledge/ (ChromaDB)
  │   Claude API: claude-sonnet-4-6 or claude-haiku-4-5-20251001
  │
  └─ COMPLIANCE ENGINE (mandatory gate)
      packages/compliance/src/ComplianceEngine.ts
      Checks: crisis keywords, medical advice, exaggeration,
              PII in response, legal advice boundary, guaranteed outcomes
      Action: blocks or rewrites response — never bypassed
```

---

## Package Dependency Tiers

Turborepo enforces build order via `"dependsOn": ["^build"]`. Never import from a higher tier into a lower tier.

```
Tier 0 — Foundation
  shared-types     all TypeScript interfaces, no logic
  shared-config    constants, feature flags, env var accessors

Tier 1 — Utilities
  shared-utils     PII regex, score calculator, CFR citation parser
  events           EventBus, VetAssistEvent types (Observer pattern)

Tier 2 — Safety
  pii              PIIDetector (→ shared-types, events)
  crisis           CrisisDetector (→ shared-types, events)
  legal            LegalBoundaryEngine (→ shared-types)
  compliance       ComplianceEngine (→ pii, crisis, legal, events)

Tier 3 — AI & Knowledge
  knowledge        ChromaClient, RetrievalPipeline, EmbeddingService
  ai               ChatPipeline, 8 handlers, PromptLoader (→ compliance, knowledge)

Tier 4 — Domain
  upload           UploadService, OCRService, AES-256 storage
  benefits         BenefitsService, EligibilityChecker, 56-benefit seed
  claims           ClaimsStore, DeadlineCalculator
  community        CommunityStore, story submission, upvotes
  moderation       toxic-bert, spam detection, admin queue
  faq-glossary     FAQService, GlossaryService, WorkaroundService

Tier 5 — Platform
  ui-components    CrisisLineBanner, ScoreRing, PIIWarningModal, AIDisclosureBanner
  auth             Auth0 integration (Phase 4)
  consent          Consent engine, data lifecycle (Phase 4)

Tier 6 — Apps (always last)
  apps/api         Fastify server, registers all 24 routes
  apps/web         Next.js App Router, 14 pages
  apps/mobile      React Native (Phase 4)
```

---

## Event-Driven Communication

All cross-system state changes use the Observer pattern via `packages/events/`. Zero polling anywhere.

| Event | Emitter | Subscribers |
|-------|---------|-------------|
| `USER_INPUT_RECEIVED` | API routes | PII middleware |
| `PII_DETECTED` | PIIDetector | Compliance Engine, audit log |
| `CRISIS_DETECTED` | CrisisDetector | Compliance Engine, CrisisLineBanner |
| `AI_RESPONSE_GENERATED` | ChatPipeline | Compliance Engine |
| `COMPLIANCE_PASSED` | ComplianceEngine | API route (sends to client) |
| `COMPLIANCE_FAILED` | ComplianceEngine | API route (blocks response) |
| `DOCUMENT_UPLOADED` | UploadService | PII scrubber, OCR pipeline |
| `SUGGESTION_ACCEPTED` | InlineDiffHandler | Audit logger |
| `DATA_DELETION_REQUESTED` | Phase 4 | Consent engine, audit log |

---

## In-Memory vs Database

Several packages use in-memory stores as MVP placeholders — they reset on API restart. Migration to Prisma + PostgreSQL is scheduled for Phase 4.

| Package | Current Storage | Prisma Model (future) |
|---------|----------------|----------------------|
| `claims` | In-memory array | `Claim` |
| `community` | In-memory array | `CommunityStory` |
| `faq-glossary` | In-memory seeded constants | `FAQEntry`, `GlossaryTerm`, `VAWorkaround` |
| `benefits` | In-memory 56-benefit seed | `Benefit` |
| `knowledge` | ChromaDB (vector, persistent) | ChromaDB (unchanged) |

When adding Prisma: inject `PrismaClient` via constructor — never as a module-level singleton (causes connection pool exhaustion on Railway).

---

## API Routes

All registered in `apps/api/src/server.ts` under `/api` prefix.

| Route | Handler | Notes |
|-------|---------|-------|
| POST /api/chat | ChatHandler | PII + compliance gated |
| POST /api/documents/review | DocumentReviewHandler | Scoring mode: encouraging / strict |
| POST /api/documents/review/inline | InlineDiffHandler | Per-span diffs with offsets |
| POST /api/documents/upload | UploadService | Multipart, OCR, AES-256, 24h TTL |
| POST /api/documents/generate | DocumentWriterHandler | Wizard → scored document |
| POST /api/documents/share | SharingService | PII re-scan before every share |
| POST /api/documents/decision-letter | DecisionLetterHandler | PII scrub before AI |
| GET /api/benefits | BenefitsService | All 56 benefits |
| GET /api/benefits/search | BenefitsService | Keyword + category filter |
| GET /api/benefits/hidden-gems | BenefitsService | Curated undiscovered list |
| GET /api/benefits/:id | BenefitsService | Single benefit detail |
| POST /api/benefits/eligibility | EligibilityChecker | Questionnaire → matched benefits |
| GET/POST /api/claims | ClaimsStore | In-memory MVP |
| GET/POST /api/community/stories | CommunityStore | Moderation gated on submit |
| GET /api/community/admin/queue | ModQueueHandler | Admin only (Phase 4 auth) |
| GET /api/learning | LearningHubRoute | Filter by topic/type/difficulty |
| GET /api/learning/:id | LearningHubRoute | Single resource |
| GET /api/faq | FAQGlossaryRoute | Paginated, category + keyword filter |
| GET /api/faq/search | FAQGlossaryRoute | Full-text search |
| POST /api/faq/:id/upvote | FAQGlossaryRoute | Ephemeral upvote (MVP) |
| GET /api/glossary | FAQGlossaryRoute | All terms, alphabetical |
| GET /api/glossary/search | FAQGlossaryRoute | Term + definition + acronym search |
| GET /api/glossary/letter/:letter | FAQGlossaryRoute | A–Z jump nav |
| GET /api/workarounds | FAQGlossaryRoute | VA website fix guides |
| GET /health | server.ts | Uptime check |

---

## Web Pages

All in `apps/web/src/app/` using Next.js 14 App Router.

| Route | Description | AI-Powered |
|-------|-------------|-----------|
| / | Home / Hero | No |
| /chat | AI Chat Interface | Yes |
| /documents | Document Review + Upload | Yes |
| /discover | Benefits Discovery | No |
| /discover/[id] | Benefit Detail | No |
| /generate | Document Generator Wizard | Yes |
| /tracker | Claims Tracker | No |
| /community | Veteran Stories Feed | No |
| /community/submit | Story Submission | Yes (tip extraction) |
| /decision-letter | Decision Letter Explainer | Yes |
| /learn | Learning Hub | No |
| /faq | FAQ + VA Workaround Guide | No |
| /glossary | VA Terminology Glossary | No |
| /settings | Accessibility + Scoring Mode | No |

---

## AI Handlers

All in `packages/ai/src/handlers/`.

| Handler | Model | Input | Output |
|---------|-------|-------|--------|
| ChatHandler | sonnet-4-6 | Sanitized text + RAG chunks | Cited response |
| DocumentReviewHandler | sonnet-4-6 | Document text + scoring mode | Score + suggestions |
| InlineDiffHandler | sonnet-4-6 | Document text | Per-span diffs with offsets |
| DocumentWriterHandler | sonnet-4-6 | Wizard answers + doc type | Generated document |
| DecisionLetterHandler | sonnet-4-6 | OCR'd letter (PII-scrubbed) | Per-condition breakdown |
| StoryBuilderHandler | haiku-4-5 | Approved story text | 2–3 extracted tips |
| RequestClassifier | haiku-4-5 | Raw user input | Request type |
| SharingService | — | Document content | Email/SMS/download |

---

## Data Handling Policies

| Concern | Policy |
|---------|--------|
| SSN in uploads | Accept → auto-redact → warn user → log event type + timestamp only |
| File storage | AES-256 encrypted temp, 24h default, 30d max, nightly orphan cleanup |
| File formats | PDF, JPEG, PNG, HEIC, TIFF, .docx, .txt → normalized to plain text before AI |
| Document sharing | Direct only (email/SMS/download) — no share links, PII re-scan before share |
| Scoring mode | Encouraging (default) or Strict — veteran-configurable in /settings |
| Data deletion | Secure wipe (overwrite + delete), deletion certificate PDF, pre-deletion download |
| Analytics | PostHog, self-hosted, consent-required, anonymous only — no PII in events |
