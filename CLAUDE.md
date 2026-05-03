# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Identity

**VetAssist — Your AI Battle Buddy for VA Benefits**
Educational and empowerment platform for veterans. Document quality assistant (Grammarly for VA paperwork), benefits discovery engine, and veteran community. NOT a law firm, claims filing service, or outcome guarantor.

**Legal position:** Educational platform under VA OGC 2004 Opinion — permitted activities only. Free for all veterans.

---

## Commands

```bash
# Install
npm install

# Development (starts web :3000, API :3001, all watchers)
npx turbo dev

# Build all packages (run before PR)
npx turbo build

# Tests
npx turbo test
npx turbo test:pii        # PII scrubber tests (20+ cases required)
npx turbo test:compliance # Compliance engine tests

# Type check + lint
npx turbo typecheck
npx turbo lint

# Database
npx prisma migrate dev
npx prisma db seed        # Seeds benefits, FAQ, glossary

# Clean
npx turbo clean && rm -rf node_modules
```

**Environment setup:** Copy `environment/.env.example` to `.env`. Minimum required: `DATABASE_URL`, `CLAUDE_API_KEY`.

---

## Architecture

### Monorepo Layout (Turborepo)

```
apps/web       → Next.js 14 (App Router), Tailwind, shadcn/ui — deployed to Vercel
apps/mobile    → React Native (Expo), NativeWind
apps/api       → Fastify, Node.js 20+ — deployed to Railway
packages/      → 95% of all logic lives here
```

### 95/5 Rule
95% of logic in shared packages, 5% platform-specific rendering. All business logic, types, AI orchestration, and validation must live in `packages/` — never duplicated in apps.

### Critical Data Flow (Must Not Break)

```
USER INPUT
  → Layer 1: Client-side PII regex (packages/shared-utils/pii-detector.ts)
  → Layer 2: Server PII middleware (Presidio + HF NER)
  → Layer 3: AI pre-processor strip (before any text reaches Claude)
  → AI ORCHESTRATOR (packages/ai-engine)
  → COMPLIANCE ENGINE (mandatory gate — all AI responses must pass before display)
  → USER
```

### Event-Driven Communication
All cross-system communication uses the Observer pattern. Zero polling anywhere. Key events: `USER_INPUT_RECEIVED`, `PII_DETECTED`, `AI_RESPONSE_GENERATED`, `COMPLIANCE_PASSED/FAILED`, `DATA_DELETION_REQUESTED`.

### Packages Reference

| Package | Purpose |
|---------|---------|
| `shared-types` | All TypeScript interfaces (Document, Benefit, CommunityPost, PIIDetectionEvent, ScoreResult, etc.) |
| `shared-utils` | PII detector, SSN patterns, score calculator, CFR citation parser |
| `shared-config` | App config, feature flags, named constants (zero magic numbers/strings) |
| `ai-engine` | Claude API orchestration, RAG pipeline (Chroma), compliance checker, prompt loader, handlers |
| `auth` | Auth0 integration, sessions, bot protection |
| `consent` | Consent engine, scope management, data lifecycle |
| `community` | Testimonials, moderation, upvotes, comments, karma, graduated-response |
| `moderation` | toxic-bert, PII scrubber, spam detection, admin queue, lockdown toggle |
| `scraper` | eCFR + Federal Register + VA.gov monitors, relevance classifier, newsletter generator |
| `archive` | Archive manager, version history, comparison engine |
| `notifications` | In-app, email, push, SMS notification routing |
| `insights` | Pattern detection, clustering, insight generation |
| `reports` | PDF generation, email digest, deletion certificates |
| `ui-components` | Shared components: CrisisLineBanner, PIIWarningModal, ScoreRing, DocumentDropZone, AIDisclosureBanner, AccessibilityControls |

### AI Models (Claude API)
- `claude-sonnet-4-6` — reasoning, document review, decision letter analysis
- `claude-haiku-4-5-20251001` — fast classification tasks

Skill files in `claude/skills/` define the prompt engineering for each AI feature. **Read the relevant skill file before implementing any AI handler.**

**Claude Code skills registry:** `claude/skills/skills-registry.md` — full list of all skills (cowork-skills from `C:\ClaudeSkills\`, ui-ux-pro-max, karpathy-skills) mapped to VetAssist features. Read before starting any implementation task.

---

## Non-Negotiable Rules

### Safety — Never Skip These
- **PII scrubber runs on EVERY text input and file upload** — zero exceptions
- **Crisis detection** (suicide/self-harm keywords) must trigger Veterans Crisis Line display IMMEDIATELY — `CrisisLineBanner` is non-dismissable on every screen
- **All AI responses pass through Compliance Engine BEFORE reaching the user** — crisis, medical advice, legal advice, outcome guarantee detection
- **AI disclosure banner** on every AI-powered screen — `AIDisclosureBanner` component
- **SSNs are NEVER stored, logged, or sent to AI** — redact before processing, log only event type + timestamp

### Coding Standards (Marcus Daley Universal Standards)
- **File headers required on every file:** filename, developer, date, purpose
- **Single-line comments only** (`//`) — never block comments (`/* */`)
- **Comments explain WHY, never WHAT**
- **Zero hardcoded values** — all from `packages/shared-config` or env vars
- **Zero magic numbers or strings** — named constants only
- **Most restrictive access** — every property is as private as it can be
- **No public mutable state** — getters only for external reads

### Before Submitting a PR
- [ ] `npx turbo build` passes across all packages
- [ ] `npx turbo test` passes including `test:pii` and `test:compliance`
- [ ] No hardcoded values (grep for API keys, URLs, numbers in business logic)
- [ ] All new files have proper headers
- [ ] New components have ARIA labels and keyboard navigation (WCAG 2.1 AA)
- [ ] New AI response paths flow through Compliance Engine

---

## Phase Execution State

Progress tracked in `.vetassist-progress.json`. Update task status (`not_started` → `in_progress` → `completed`) as work completes. Never regenerate files that already exist and pass validation.

**Current status (2026-05-01):**
- Phase 1 — COMPLETE (13 packages, PII + compliance tests passing)
- Phase 2 — COMPLETE (upload, benefits, document review, generator, claims, sharing)
- Phase 3 — COMPLETE (6/6 tasks done — community, moderation, decision letter, learning hub, FAQ/glossary, VR&E)
- Phase 4 — IN PROGRESS: 4/6 tasks done. Next: Task 4.5 VA Update System

**Built packages (20 total):** shared-types, shared-config, shared-utils, events, pii, crisis, legal, compliance, ai, knowledge, upload, benefits, claims, community, moderation, ui-components, auth (scaffolding), consent (scaffolding), faq-glossary (in-memory MVP), insights

**Built web pages:** /, /chat, /settings, /documents, /discover, /discover/[id], /generate, /tracker, /community, /community/submit, /decision-letter, /learn, /faq, /glossary, /vre, /impact, /admin/analytics

**Built API routes:** /api/chat, /api/documents/review, /api/documents/review/inline, /api/documents/upload, /api/documents/generate, /api/documents/share, /api/documents/decision-letter, /api/benefits, /api/benefits/search, /api/benefits/hidden-gems, /api/benefits/:id, /api/benefits/eligibility, /api/claims, /api/community/stories, /api/community/admin/queue, /api/learning, /api/faq, /api/glossary, /api/workarounds, /api/analytics/consent, /api/analytics/consent/:sid, /api/analytics/events, /api/analytics/impact, /api/admin/analytics/dashboard, /api/admin/analytics/report

- Brainstorm scope: docs/BRAINSTORM_2026-05-01.md (locked 2026-05-01)

**Phase task definitions:**
- `claude/tasks/phase1_foundation.md` — Monorepo, PII scrubber, compliance engine, API, chat, basic web UI
- `claude/tasks/phase2_3_4_tasks.md` — Education tools, community, mobile, analytics

---

## Tech Stack (Fixed — Do Not Substitute)

| Concern | Technology |
|---------|-----------|
| Web | Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | React Native (Expo), NativeWind |
| API | Fastify, TypeScript, Zod validation |
| DB | PostgreSQL + Prisma ORM |
| Vector DB | Chroma (self-hosted, DigitalOcean) |
| AI | Anthropic Claude API |
| PII | Client regex + Microsoft Presidio + HF `pii-entity-extractor` |
| Moderation | HF `unitary/toxic-bert` |
| OCR | Tesseract.js + `microsoft/trocr-large-printed` fallback |
| Auth | Auth0 |
| Analytics | PostHog (self-hosted, consent-required, anonymous only) |
| Web hosting | Vercel |
| API hosting | Railway |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo |

---

## Document Handling Policies (From Owner Configuration)

- **SSN in uploads:** Accept → auto-redact with black-bar overlay → warn user → log event (type+timestamp only, never value)
- **File storage:** AES-256 encrypted temp, 24h auto-purge default, 30d max, orphan cleanup nightly
- **File formats accepted:** PDF, JPEG, PNG, HEIC, TIFF, .docx, .txt — normalized to plain text before AI
- **Document sharing:** Direct only (email/SMS/download) — NO share links, PII re-scan before any share
- **Scoring modes:** "Encouraging" (default) vs "Strict" — veteran-configurable
- **Deletion:** Secure wipe (overwrite + delete), deletion certificate PDF auto-generated, pre-deletion download offered

---

## Context Strategy

- Load only the skill/task files needed for the current phase — `claude/skills/` for feature context
- If a session exceeds 50K tokens, save structured state to `.vetassist-progress.json` and start fresh
- Prefer modular files (one concern per file) over monolithic implementations

---

## Brainstorming Artifact Standard

When Marcus opens any new project, feature, milestone, or major architectural decision, the response begins with a structured **Brainstorm Artifact**, never with code.

This applies whether the trigger is explicit ("brainstorm this", "scope this", "what should this do") or implicit (a project name appears without prior scope, a new phase begins, or a decision between implementation paths is requested). When in doubt, default to producing the artifact.

### Required Format

The artifact is a markdown document titled `[PROJECT_NAME] BRAINSTORM RESPONSES` with a `Captured: [DATE]` line below the title. The body is organized into three to six thematic SECTIONS, each containing three to six grouped QUESTIONS, each question containing two to eight OPTION rows.

Every option is rendered as either `[ ] Label: Trade-off rationale` (open decision) or `[x] Label: Trade-off rationale` (decision already locked from the conversation or from prior sessions). The trade-off rationale is one sentence describing what the option gives and what it costs, so Marcus can scan a question in five seconds without expanding anything.

### Required Coverage

The artifact must cover the full scope of the project end-to-end, not just the immediate next session's work. The point of locking the picture is to prevent Claude or Claude Code from implementing only a slice and missing adjacent decisions that would force rework later. If the project has audience, tech stack, AI engine, MVP lock, compliance, funding, and launch dimensions, all of them appear as sections even if some have only one or two questions.

### Decision Pre-Checking

Options Marcus has already decided in the current chat or in prior sessions are pre-checked with `[x]` before the artifact is presented. The artifact is a record of decisions plus open questions, not just open questions. If a stack choice was locked three sessions ago in a related project, render it as locked here too with a note like "(carried from Bob)" so Marcus sees the link.

### Rules That Cannot Be Violated

Trade-off options must respect the Universal Coding Standards. Never offer "quick and dirty", "just hardcode for now", "skip the tests for MVP", or any time-pressure shortcut as a valid option. Options are quality-tier alternatives only.

Never begin coding, scaffolding files, or generating any other deliverable until Marcus has reviewed the artifact and given explicit confirmation. The brainstorm gate is non-negotiable. If Marcus says "skip it" or "just write the code" he can override, but the default is always artifact first.

Never bury the decisions inside prose paragraphs. The format is scannable checklists. Personality and theme can live in section headers and intro lines, but the decision rows themselves are clean checkbox format.

### Lock and Reference

After Marcus reviews and confirms, save the artifact to the project's `docs/` folder as `BRAINSTORM_[YYYY-MM-DD].md` and append a one-line reference to this file:

```
- Brainstorm scope: docs/BRAINSTORM_YYYY-MM-DD.md (locked YYYY-MM-DD)
```

### Reference Skill

The full implementation of this behavior lives in `claude/skills/brainstorm_artifact.md`. Templates are in `claude/skills/templates/`. The VetAssist gold-standard example is at `claude/skills/examples/vetassist_reference.md`. When that skill is loaded, follow it as the source of truth. When it is not loaded, follow this section verbatim.
- Locked decisions: docs/locked-decisions-2026-05-01.md (filed 2026-05-01, ~30KB research report covering VA accreditation, HF models, legal/SB694, student pack, funding, security)
