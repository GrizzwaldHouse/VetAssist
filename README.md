# VetAssist — Your AI Battle Buddy for VA Benefits

An education and empowerment platform helping veterans understand the benefits they earned through service. Document quality assistant, benefits discovery engine, and veteran community. **Free for all veterans.**

> **Legal position:** Educational platform under VA OGC 2004 Opinion. Not a law firm, claims filing service, or outcome guarantor.

---

## Build Status

| Check | Status |
|-------|--------|
| `turbo build` | ✅ 19/19 packages |
| `test:pii` | ✅ 22/22 passing |
| `test:compliance` | ✅ 15/15 passing |
| Phase 1 | ✅ Complete (2026-04-21) |
| Phase 2 | ✅ Complete (2026-04-21) |
| Phase 3 | 🟡 5/6 tasks done |
| Phase 4 | 🔲 Not started |

---

## What VetAssist Does

| Feature | Status | Description |
|---------|--------|-------------|
| AI Chat Assistant | ✅ Live | CFR-aware chat, RAG pipeline, crisis detection, compliance gate |
| Document Review | ✅ Live | Grammarly-style scoring — Specificity, Completeness, VA Alignment, PII Safety |
| Inline Diff Review | ✅ Live | Per-span suggestions with accept/reject and full audit trail |
| Document Upload | ✅ Live | Drag-and-drop, OCR, AES-256 encrypted temp storage, 24h auto-purge |
| Document Generator | ✅ Live | Guided wizard for VA letters, personal statements, buddy statements |
| Document Sharing | ✅ Live | Email/SMS/download — PII re-scanned before every share, no share links |
| Benefits Discovery | ✅ Live | 56 benefits across 10 categories, eligibility checker, hidden gems |
| Claims Tracker | ✅ Live | Timeline, deadlines, checklist, countdown alerts |
| Veteran Stories | ✅ Live | Community stories, AI tip extraction, upvotes, 3-layer moderation |
| Decision Letter Explainer | ✅ Live | Per-condition breakdown, combined rating calculator, appeal options |
| Learning Hub | ✅ Live | 12 curated resources, AI key takeaways, filter by topic/difficulty |
| FAQ & Glossary | ✅ Live | 22 FAQ entries, 32 VA terms with CFR links, 5 VA website workarounds |
| VR&E Chapter 31 Guide | 🔲 Next | Eligibility checker, 4-track explainer, Ch.31 vs Ch.33 comparison |
| Mobile App | 🔲 Phase 4 | React Native + Expo |
| Offline Mode | 🔲 Phase 4 | Cached benefits, FAQ, glossary via Service Worker |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and fill in required values
cp environment/.env.example .env
# Minimum required: DATABASE_URL, CLAUDE_API_KEY

# Start development servers (web :3000, API :3001)
npx turbo dev
```

---

## Commands

```bash
npx turbo dev              # Start all apps in watch mode
npx turbo build            # Build all packages (run before PR)
npx turbo test             # Run all tests
npx turbo test:pii         # PII scrubber tests (22 cases)
npx turbo test:compliance  # Compliance engine tests (15 cases)
npx turbo typecheck        # TypeScript check across all packages
npx turbo lint             # ESLint across all packages
npx turbo clean && rm -rf node_modules  # Full clean
```

---

## Project Structure

```
apps/
  web/        Next.js 14 (App Router) — 14 pages
  api/        Fastify — 24 API routes
  mobile/     React Native (Expo) — Phase 4
packages/
  shared-types/    All TypeScript interfaces
  shared-config/   Named constants, feature flags, app config
  shared-utils/    PII regex, score calculator, CFR citation parser
  events/          Typed pub/sub event bus (Observer pattern)
  pii/             Client-side PIIDetector — SSN, VA file, DOB, credit card
  crisis/          Suicide/self-harm keyword detection with confidence scoring
  legal/           Legal boundary enforcement — directives, guarantees, eligibility
  compliance/      6-check compliance gate on all AI responses
  ai/              Claude API orchestration, RAG pipeline, 8 handlers
  knowledge/       Chroma vector DB client + retrieval pipeline
  upload/          UploadService, OCRService, AES-256 encrypted storage
  benefits/        BenefitsService, EligibilityChecker, 56-benefit seed
  claims/          ClaimsStore, DeadlineCalculator (in-memory MVP)
  community/       CommunityStore, story submission, upvotes
  moderation/      toxic-bert, spam detection, PII scrub, admin queue
  faq-glossary/    FAQService, GlossaryService, WorkaroundService (in-memory MVP)
  ui-components/   CrisisLineBanner, PIIWarningModal, ScoreRing, AIDisclosureBanner
  auth/            Auth0 integration (scaffolding — Phase 4)
  consent/         Consent engine, data lifecycle (scaffolding — Phase 4)
claude/
  skills/          Prompt engineering skill files + skills-registry.md
  tasks/           Phase task definitions
docs/
  architecture.md  System architecture, data flows, package boundaries
tests/
  pii-scrubber.test.ts      22 PII detection cases
  compliance-engine.test.ts 15 compliance/crisis/event cases
```

---

## Critical Data Flow (Must Not Break)

```
USER INPUT
  → Client PII regex        (packages/pii/)
  → Server PII middleware   (Presidio + HF NER)
  → AI pre-processor strip
  → AI Orchestrator         (packages/ai/)
  → Compliance Engine       (packages/compliance/) ← mandatory gate
  → USER
```

All cross-system communication is event-driven (Observer pattern). Zero polling anywhere.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | React Native (Expo), NativeWind |
| API | Fastify, Node.js 20+, Zod |
| DB | PostgreSQL + Prisma ORM |
| Vector DB | Chroma (self-hosted, DigitalOcean) |
| AI | Anthropic Claude API (sonnet-4-6 + haiku-4-5) |
| PII | Client regex + Microsoft Presidio + HF `pii-entity-extractor` |
| Moderation | HF `unitary/toxic-bert` |
| OCR | Tesseract.js + `microsoft/trocr-large-printed` |
| Auth | Auth0 |
| Analytics | PostHog (self-hosted, consent-required) |
| Hosting | Vercel (web) + Railway (API) |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo |

---

## Non-Negotiable Safety Rules

- **PII scrubber on every text input and file upload** — zero exceptions
- **Crisis keywords trigger Veterans Crisis Line immediately** — `CrisisLineBanner` is non-dismissable
- **All AI responses pass through Compliance Engine** before reaching the user
- **AI disclosure banner on every AI-powered screen** — `AIDisclosureBanner` component
- **SSNs never stored, logged, or sent to AI** — redact first, log event type + timestamp only

---

## Environment Variables

Copy `environment/.env.example` to `.env`. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLAUDE_API_KEY` | Yes | Anthropic Claude API |
| `CHROMA_URL` | Yes | Chroma vector DB for RAG |
| `HF_API_TOKEN` | Yes | Hugging Face — PII + toxicity models |
| `ENCRYPTION_KEY` | Yes | AES-256 key for uploaded document storage |
| `AUTH0_DOMAIN` | Phase 4 | Auth0 tenant domain |

See `environment/.env.example` for all 121 variables with descriptions.

---

## Phase Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Monorepo, PII, compliance, API server, chat, web UI |
| Phase 2 | ✅ Complete | Upload, benefits, document review, generator, claims, sharing |
| Phase 3 | 🟡 5/6 done | Community, moderation, decision letter, learning hub, FAQ/glossary |
| Phase 4 | 🔲 Not started | Mobile, offline, data deletion, analytics, CI/CD |

**Next task:** Phase 3.6 — VR&E Chapter 31 Guide
Full progress details in `.vetassist-progress.json`.

---

## Crisis Resources

If you are a veteran in crisis: **Call 988, Press 1** | Text 838255 | Chat at VeteransCrisisLine.net

---

**Developer:** Marcus Daley — [@GrizzwaldHouse](https://github.com/GrizzwaldHouse)
