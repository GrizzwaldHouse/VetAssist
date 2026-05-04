# VetAssist — Your AI Battle Buddy for VA Benefits

[![Build](https://img.shields.io/badge/turbo%20build-19%2F19%20packages-brightgreen?style=flat-square)](https://github.com/GrizzwaldHouse/VetAssist)
[![PII Tests](https://img.shields.io/badge/PII%20tests-22%2F22%20passing-brightgreen?style=flat-square)](https://github.com/GrizzwaldHouse/VetAssist)
[![Compliance Tests](https://img.shields.io/badge/compliance%20tests-15%2F15%20passing-brightgreen?style=flat-square)](https://github.com/GrizzwaldHouse/VetAssist)
[![Phase](https://img.shields.io/badge/phase-4%20of%204-blue?style=flat-square)](https://github.com/GrizzwaldHouse/VetAssist)
[![Free for Veterans](https://img.shields.io/badge/free%20for-all%20veterans-gold?style=flat-square)](https://github.com/GrizzwaldHouse/VetAssist)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)

> **Not a law firm. Not a claims filer. Not an outcome guarantor.**
> VetAssist is an educational and empowerment platform — legal position: VA OGC 2004 Opinion.

---

## What Is VetAssist?

Veterans earned their benefits through service. Getting them shouldn't require a law degree.

VA paperwork is dense, decisions are written in bureaucratic language, and the system is designed for administrators — not the people it serves. Veterans arrive confused, often after being turned away or overwhelmed by VA.gov. Many are dealing with PTSD, TBI, chronic pain, or decades of fighting the system.

**VetAssist is a knowledgeable buddy who's been through the process.** It gives veterans a plain-English AI assistant that understands CFR regulations, scores their documents like Grammarly scores writing, explains exactly what a denial letter decided and why, and shows them what their options are — without needing a lawyer.

Everything is free. Always.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture & Data Flow](#architecture--data-flow)
- [Tech Stack](#tech-stack)
- [Safety Rules](#safety-rules)
- [Environment Variables](#environment-variables)
- [Commands](#commands)
- [Build Status & Phase Progress](#build-status--phase-progress)
- [Changelog](#changelog)
- [Crisis Resources](#crisis-resources)

---

## Features

<details>
<summary><strong>AI Chat Assistant</strong> — CFR-aware chat with RAG pipeline ✅</summary>

The chat assistant is grounded in 38 CFR Parts 3 and 4, VA M21-1 Manual sections, and DBQ forms via a Chroma vector retrieval pipeline. Every response passes through a 6-check Compliance Engine before it reaches the user. Crisis keywords trigger the Veterans Crisis Line banner immediately — non-dismissable.

**What it can do:**
- Explain what a regulation says in plain English
- Describe what evidence types are typically relevant to a condition
- Show veterans what options exist after a denial
- Write a personal statement using the veteran's own words (structured by AI)

**What it will never do:** tell a veteran what rating they'll get, say "you should file for X condition," or guarantee any outcome.

</details>

<details>
<summary><strong>Document Review</strong> — Grammarly-style scoring for VA paperwork ✅</summary>

Upload a personal statement, buddy letter, or any VA document and get a scored review across four dimensions:

| Score Axis | What It Measures |
|---|---|
| **Specificity** | Are dates, locations, incidents named precisely? |
| **Completeness** | Does the document cover all required elements? |
| **VA Alignment** | Does language match what adjudicators look for? |
| **PII Safety** | Are SSNs and sensitive identifiers properly handled? |

The `ScoreRing` component animates the score visually. Inline suggestions highlight every span that can be improved, with accept/reject controls and a full audit trail. Scoring mode is veteran-configurable: **Encouraging** (default) or **Strict**.

</details>

<details>
<summary><strong>Document Generator</strong> — Guided wizard for VA letters ✅</summary>

Step-by-step guided wizard that produces VA-ready documents: personal statements, buddy statements, and VA letters. The AI structures the veteran's own words — it doesn't invent content. Every output is reviewed by the Compliance Engine before download.

</details>

<details>
<summary><strong>Document Upload & Storage</strong> — Encrypted, auto-purged ✅</summary>

- Drag-and-drop upload with OCR (Tesseract.js + TrOCR fallback)
- AES-256 encrypted temporary storage
- 24-hour auto-purge by default (30-day max, veteran-configurable)
- SSNs are auto-redacted with a black-bar overlay before any processing
- Secure deletion generates a certificate PDF the veteran can download

Accepted formats: PDF, JPEG, PNG, HEIC, TIFF, .docx, .txt

</details>

<details>
<summary><strong>Benefits Discovery</strong> — 56 benefits across 10 categories ✅</summary>

A searchable hub of 56 VA benefits with plain-English eligibility descriptions, step-by-step instructions, and a "Hidden Gems" section surfacing lesser-known benefits veterans frequently miss. The eligibility checker asks a short set of questions and returns a personalized match list.

</details>

<details>
<summary><strong>Claims Tracker</strong> — Timeline, deadlines, and countdown alerts ✅</summary>

Track open VA claims with a visual timeline, deadline calculator, and checklist. Countdown alerts surface approaching deadlines without overwhelming the veteran with notifications.

</details>

<details>
<summary><strong>Decision Letter Explainer</strong> — Per-condition breakdown ✅</summary>

Upload a VA decision letter and get a structured breakdown:
- What the VA decided for each condition, in plain English
- Why — what evidence was cited, what was missing
- Combined rating calculator
- Appeal options (HLR, Board, Supplemental) with timeframes

</details>

<details>
<summary><strong>Veteran Stories Community</strong> — 3-layer moderated ✅</summary>

Veterans share outcomes, tips, and experiences. AI extracts the key takeaway from each story for quick scanning. Every post goes through three moderation layers: toxic-bert classifier, PII scrubber, and admin queue. Upvotes, comments, and karma are tracked.

</details>

<details>
<summary><strong>Learning Hub, FAQ & Glossary</strong> — 12 resources, 22 FAQs, 32 VA terms ✅</summary>

- **Learning Hub:** 12 curated resources with AI-generated key takeaways, filterable by topic and difficulty
- **FAQ:** 22 entries covering the most common veteran questions
- **Glossary:** 32 VA terms with plain-English definitions and CFR links
- **Workarounds:** 5 documented workarounds for common VA.gov pain points

</details>

<details>
<summary><strong>VR&E Chapter 31 Guide</strong> — Eligibility checker, 4-track explainer 🔲 Next</summary>

Coming in Phase 3.6: a dedicated guide to Vocational Rehabilitation & Employment benefits, covering the 4 program tracks, Chapter 31 vs Chapter 33 comparison, and an eligibility checker.

</details>

<details>
<summary><strong>Mobile App & Offline Mode</strong> — React Native + Expo 🔲 Phase 4</summary>

React Native (Expo) app with NativeWind styling. Offline mode via Service Worker — cached benefits, FAQ, and glossary available without a connection.

</details>

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in required values
cp environment/.env.example .env
# Minimum required: DATABASE_URL, CLAUDE_API_KEY

# 3. Start Chroma vector DB (Docker or local)
# chroma run --path ./chroma-data

# 4. Run database migrations and seed
npx prisma migrate dev
npx prisma db seed

# 5. Start development servers (web :3000, API :3001)
npx turbo dev
```

> **First time?** See the [Environment Variables](#environment-variables) section for all required keys.

---

## Project Structure

<details>
<summary><strong>Click to expand full directory layout</strong></summary>

```
apps/
  web/          Next.js 14 App Router — 14 pages
  api/          Fastify — 24 API routes
  mobile/       React Native (Expo) — Phase 4

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
  claims/          ClaimsStore, DeadlineCalculator
  community/       CommunityStore, story submission, upvotes
  moderation/      toxic-bert, spam detection, PII scrub, admin queue
  faq-glossary/    FAQService, GlossaryService, WorkaroundService
  ui-components/   CrisisLineBanner, PIIWarningModal, ScoreRing, AIDisclosureBanner
  auth/            Auth0 integration (scaffolding — Phase 4)
  consent/         Consent engine, data lifecycle (scaffolding — Phase 4)

claude/
  skills/          Prompt engineering skill files + skills-registry.md
  tasks/           Phase task definitions

docs/
  architecture.md          System architecture, data flows, package boundaries
  security_compliance.md   Regulatory compliance, security policies
  ui-design-spec.md        Full UI/UX specification

tests/
  pii-scrubber.test.ts       22 PII detection cases
  compliance-engine.test.ts  15 compliance/crisis/event cases
```

</details>

---

## Architecture & Data Flow

Every user input follows this exact pipeline — no shortcuts, no exceptions:

```
USER INPUT
  → [Layer 1] Client PII regex         packages/pii/
  → [Layer 2] Server PII middleware     Presidio + HF NER
  → [Layer 3] AI pre-processor strip   before any text reaches Claude
  → AI Orchestrator                     packages/ai/
  → Compliance Engine  ← mandatory gate packages/compliance/
  → USER
```

All cross-package communication uses the Observer pattern (typed event bus). **Zero polling anywhere.**

<details>
<summary><strong>Key events in the system</strong></summary>

| Event | Trigger |
|---|---|
| `USER_INPUT_RECEIVED` | Any text submission |
| `PII_DETECTED` | SSN, VA file number, DOB, or credit card found |
| `AI_RESPONSE_GENERATED` | Claude API returns a response |
| `COMPLIANCE_PASSED` | Response cleared all 6 compliance checks |
| `COMPLIANCE_FAILED` | Response blocked — regenerate or show safe fallback |
| `DATA_DELETION_REQUESTED` | Veteran requests secure wipe |

</details>

<details>
<summary><strong>Package build order (Turborepo tiers)</strong></summary>

```
Tier 1 (no internal deps):  shared-types, shared-config
Tier 2:  shared-utils, auth
Tier 3:  ai, compliance, consent, moderation
Tier 4:  community, insights, scraper, archive, notifications, reports
Tier 5:  ui-components, apps/api, apps/web, apps/mobile
```

</details>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | React Native (Expo), NativeWind |
| API | Fastify, Node.js 20+, Zod |
| Database | PostgreSQL + Prisma ORM |
| Vector DB | Chroma (self-hosted, DigitalOcean) |
| AI | Anthropic Claude API (`claude-sonnet-4-6` + `claude-haiku-4-5`) |
| PII Detection | Client regex + Microsoft Presidio + HF `pii-entity-extractor` |
| Moderation | HF `unitary/toxic-bert` |
| OCR | Tesseract.js + `microsoft/trocr-large-printed` fallback |
| Auth | Auth0 |
| Analytics | PostHog (self-hosted, consent-required, anonymous only) |
| Web Hosting | Vercel |
| API Hosting | Railway |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo |

---

## Safety Rules

These are non-negotiable and enforced at the code level, not by convention.

- **PII scrubber runs on every text input and file upload** — zero exceptions, three layers
- **Crisis keywords trigger the Veterans Crisis Line banner immediately** — `CrisisLineBanner` is non-dismissable on every screen
- **All AI responses pass through the Compliance Engine** before reaching the user — crisis, medical advice, legal advice, and outcome guarantee detection
- **AI disclosure banner on every AI-powered screen** — `AIDisclosureBanner` component
- **SSNs are never stored, logged, or sent to the AI** — redact first, log only event type + timestamp

---

## Environment Variables

Copy `environment/.env.example` to `.env`. The file documents all 121 variables.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLAUDE_API_KEY` | Yes | Anthropic Claude API |
| `CHROMA_URL` | Yes | Chroma vector DB for RAG |
| `HF_API_TOKEN` | Yes | Hugging Face — PII + toxicity models |
| `ENCRYPTION_KEY` | Yes | AES-256 key for uploaded document storage |
| `AUTH0_DOMAIN` | Phase 4 | Auth0 tenant domain |

---

## Commands

```bash
npx turbo dev              # Start all apps in watch mode (web :3000, API :3001)
npx turbo build            # Build all packages — run before any PR
npx turbo test             # Full test suite across all packages
npx turbo test:pii         # PII scrubber tests (22 cases)
npx turbo test:compliance  # Compliance engine tests (15 cases)
npx turbo typecheck        # TypeScript strict mode check across all packages
npx turbo lint             # ESLint across all packages
npx turbo clean && rm -rf node_modules  # Full clean
```

---

## Build Status & Phase Progress

| Check | Status |
|---|---|
| `turbo build` | ✅ 19/19 packages |
| `test:pii` | ✅ 22/22 passing |
| `test:compliance` | ✅ 15/15 passing |

| Phase | Status | Scope |
|---|---|---|
| Phase 1 | ✅ Complete | Monorepo, PII scrubber, compliance engine, API server, AI chat, web UI |
| Phase 2 | ✅ Complete | Upload, benefits discovery, document review, generator, claims tracker, sharing |
| Phase 3 | 🟡 5/6 done | Community, moderation, decision letter, learning hub, FAQ/glossary |
| Phase 4 | 🔲 Not started | Mobile app, offline mode, data deletion, analytics dashboard, CI/CD |

**Next task:** Phase 3.6 — VR&E Chapter 31 Guide. Full progress in `.vetassist-progress.json`.

---

## Changelog

> This table is auto-updated by the [Update README](.github/workflows/update-readme.yml) GitHub Action on every push to `main`. Each entry links a commit SHA to the change it delivered.

| Commit | Date | Change | Author |
|--------|------|--------|--------|
| `cc36d9a` | 2026-05-03 | fix(ci): commit all missing source files to unblock CI | Marcus Daley |
| `b16f5fc` | 2026-05-03 | chore: update package-lock.json for posthog-js and posthog-node deps | Marcus Daley |
| `cb3e274` | 2026-05-03 | feat(phase4.4): add analytics & grant reporting layer | Marcus Daley |
| `ab8ee9c` | 2026-04-29 | feat(phase3.6): add VR&E nav link, README changelog section, and auto-update GitHub Action | Marcus Daley |
| `1b09fd7` | 2026-04-29 | docs: rewrite README with interactive GitHub formatting | Marcus Daley |

---

## Crisis Resources

If you are a veteran in crisis:

**Call 988, then press 1** | Text **838255** | Chat at [VeteransCrisisLine.net](https://www.veteranscrisisline.net)

---

**Developer:** Marcus Daley — [@GrizzwaldHouse](https://github.com/GrizzwaldHouse)
