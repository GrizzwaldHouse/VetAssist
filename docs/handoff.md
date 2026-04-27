# VetAssist — Claude Code Handoff Document
# Developer: Marcus Daley
# Date: 2026-04-20
# Purpose: Complete implementation handoff for Claude Code to build the final product.
# This is the authoritative execution guide. Read CLAUDE.md first, then this file.

---

## READ THESE IN ORDER BEFORE TOUCHING ANY CODE

1. `claude/CLAUDE.md` — Project identity, all configuration decisions, coding standards, tech stack
2. `docs/architecture.md` — System architecture diagram, event system, data flow
3. `docs/security_compliance.md` — Regulatory compliance, security policies, data handling tables
4. `docs/ui-design-spec.md` — Complete UI/UX spec (read before any frontend work)
5. `docs/final_integration_addendum.md` *(see `claude/skills/final_integration_addendum.md`)* — Missing features, knowledge scraper, archive system, communication safety
6. Current phase task file (see Phase Status below)

---

## CURRENT STATE

All phases are `not_started` per `.vetassist-progress.json`. The monorepo scaffold exists (package.json, turbo.json, tsconfig.json, directory structure) but all `src/` directories contain only `.gitkeep` files — **no implementation code exists yet.**

You are building everything from scratch. The scaffold is your guide.

---

## PHASE EXECUTION ORDER

Execute phases in order. Do not start Phase 2 until Phase 1 completion criteria pass.

### Phase 1 — Foundation (Start Here)
**Task file:** `claude/tasks/phase1_foundation.md`

Execute in this order:
1. **Monorepo Scaffold** — Set up package.json files for all packages with internal dependencies, path aliases, turbo pipeline. Verify: `npx turbo build` completes.
2. **Shared Types** — All TypeScript interfaces in `packages/shared-types/src/`. This unlocks everything else.
3. **PII Scrubber** — `packages/shared-utils/src/pii-detector.ts` + `ssn-patterns.ts`. Write 20+ tests. This is the most critical safety system.
4. **Compliance Engine** — `packages/ai-engine/src/compliance-checker.ts`. Event-driven, tests for all violation types.
5. **API Server** — Fastify in `apps/api/src/`. Routes: `/chat`, `/documents/review`, `/documents/generate`, `/health`. PII middleware on all routes.
6. **AI Chat Handler** — `packages/ai-engine/src/handlers/chat-handler.ts`. RAG pipeline + Claude API. All responses through Compliance Engine.
7. **Next.js Web App (Basic)** — App Router structure, Tailwind, shadcn/ui. Crisis Banner, basic chat page, settings page.
8. **Core UI Components** — CrisisLineBanner, PIIWarningModal, AIDisclosureBanner, AccessibilityControls, ScoreRing.

### Phase 2 — Education & Document Tools
**Task file:** `claude/tasks/phase2_3_4_tasks.md` (Phase 2 section)

Read skill files before implementing:
- `claude/skills/document_reviewer.md` before document review
- `claude/skills/document_writer.md` before document generator

Tasks: Benefits discovery hub, document review (Grammarly-style), document generator (wizard), claims tracker, upload system, sharing system.

### Phase 3 — Community & Intelligence
**Task file:** `claude/tasks/phase2_3_4_tasks.md` (Phase 3 section)

Read skill files before implementing:
- `claude/skills/auth_consent_intelligence.md` — Auth, consent engine, insight engine, reports
- `claude/skills/story_builder_decision_accessibility.md` — Community story builder, decision explainer
- `claude/skills/research_agents.md` / `research_sub_agent.md` — Knowledge scraper agents

Tasks: Veteran stories community, moderation system, decision letter explainer, learning hub, FAQ/glossary, VR&E guide, auth system, consent engine, veteran profiles, insight engine.

### Phase 4 — Mobile & Polish
**Task file:** `claude/tasks/phase2_3_4_tasks.md` (Phase 4 section)

Tasks: React Native app, offline mode, data destruction system, analytics dashboard, monthly VA update system, CI/CD pipeline.

---

## ARCHITECTURE CRITICAL PATHS

These invariants must hold at all times. Breaking any of them is a blocking error.

### PII Pipeline (Never Skip)
```
Any text input from user
  → packages/shared-utils/src/pii-detector.ts (client-side regex, Layer 1)
  → apps/api/src/middleware/ PII middleware (Presidio + HF NER, Layer 2)
  → packages/ai-engine/src/ pre-processor strip (before Claude API call, Layer 3)
```

### AI Response Pipeline (Never Skip)
```
Claude API response
  → packages/ai-engine/src/compliance-checker.ts
  → Check: crisis keywords → medical advice → legal advice → outcome guarantees
  → COMPLIANCE_PASSED event → return to user
  → COMPLIANCE_FAILED event → regenerate or block
```

### Event System (No Direct Calls Between Packages)
Cross-package communication uses events only. Never import and call a function from another package directly — emit an event and let the subscriber handle it.

Key event bus location: `packages/shared-config/src/events.ts` (create this)

---

## ENVIRONMENT SETUP FOR IMPLEMENTATION

```bash
# 1. Copy env template
cp environment/.env.example .env

# 2. Minimum values to set in .env
DATABASE_URL=postgresql://user:password@localhost:5432/vetassist
CLAUDE_API_KEY=sk-ant-api-...   # Get from console.anthropic.com
CLAUDE_MODEL_PRIMARY=claude-sonnet-4-6
CLAUDE_MODEL_FAST=claude-haiku-4-5-20251001

# 3. Install all dependencies
npm install

# 4. Start Chroma (vector DB) — run in Docker or locally
# chroma run --path ./chroma-data

# 5. Seed the database after Prisma schema is created
npx prisma migrate dev
npx prisma db seed

# 6. Start development
npx turbo dev
```

---

## PACKAGE DEPENDENCY MAP

Build these packages in this order (each depends on the ones above it):

```
Tier 1 (no internal deps):
  packages/shared-types
  packages/shared-config

Tier 2 (depends on Tier 1):
  packages/shared-utils      → depends on shared-types, shared-config
  packages/auth              → depends on shared-types

Tier 3 (depends on Tier 1-2):
  packages/ai-engine         → depends on shared-types, shared-utils, shared-config
  packages/consent           → depends on shared-types, auth
  packages/moderation        → depends on shared-types, shared-utils

Tier 4 (depends on Tier 1-3):
  packages/community         → depends on shared-types, auth, consent, moderation
  packages/insights          → depends on shared-types, consent
  packages/scraper           → depends on shared-types, shared-config
  packages/archive           → depends on shared-types, shared-config
  packages/notifications     → depends on shared-types, auth, consent
  packages/reports           → depends on shared-types

Tier 5 (depends on all packages):
  packages/ui-components     → depends on shared-types, shared-utils, shared-config
  apps/api                   → depends on all packages
  apps/web                   → depends on all packages, ui-components
  apps/mobile                → depends on all packages, ui-components
```

---

## UI IMPLEMENTATION RULES (Read docs/ui-design-spec.md First)

When building UI, apply these rules without exception:

1. Install and invoke the `frontend-design` Claude Code skill before generating any component
2. Check `packages/ui-components/src/` for existing shared components first
3. All colors from the design token variables in `ui-design-spec.md` — no hardcoded hex values
4. Dark mode is DEFAULT — do not build light-first and adapt
5. Crisis line banner is non-dismissable — if you find yourself adding a close button, remove it
6. ScoreRing component: animated, respects `prefers-reduced-motion`
7. Every text input gets a PII scanning visual indicator (subtle pulsing border)
8. Microphone button on every text input (STT)
9. "Read Aloud" button on every content block (TTS)
10. Minimum touch target: 48x48px everywhere

---

## FEATURE FLAGS (All In packages/shared-config/src/feature-flags.ts)

```typescript
// These are the toggles that control system behavior
// ALL must be config-driven — never hardcoded
const FEATURE_FLAGS = {
  PAYWALL_ENABLED: false,            // Free for all veterans — toggle for future monetization
  ANALYTICS_ENABLED: false,          // Off until explicit consent
  MODERATION_LOCKDOWN: false,        // Admin toggle for full manual approval
  SCORING_DEFAULT_MODE: 'encouraging', // 'encouraging' | 'strict'
  AI_DISCLOSURE_ENABLED: true,
  PII_DETECTION_ENABLED: true,
  PII_AUTO_REDACT: true,
  OFFLINE_MODE_ENABLED: true,
}
```

---

## CLAUDE CODE SKILLS (Install + Apply)

**Full registry:** `claude/skills/skills-registry.md`

| Skill | Source | When |
|-------|--------|------|
| `universal-coding-standards` | `C:\ClaudeSkills\skills\` | ALL code |
| `enterprise-secure-ai-engineering` | `C:\ClaudeSkills\skills\` | ALL security/API/auth work |
| `frontend-design` | `C:\ClaudeSkills\skills\` | ANY frontend — anti-slop enforcement |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | ANY frontend — style/palette/font database |
| `design-system` | `C:\ClaudeSkills\skills\` | ANY frontend — WCAG + grid validation |
| `superpowers-workflow` | `C:\ClaudeSkills\skills\` | PII/compliance tests (TDD) |
| `verified-build-gate` | `C:\ClaudeSkills\skills\` | Phase completion checks |
| `karpathy-skills` | https://github.com/forrestchang/andrej-karpathy-skills | ALL sessions |
| `context-optimization` | `C:\ClaudeSkills\skills\` | Sessions >50K tokens |

```bash
# Update cowork-skills
cd "C:\ClaudeSkills" && git pull && .\setup.ps1

# Install ui-ux-pro-max
npm install -g uipro-cli && uipro init --ai claude --global

# Install karpathy-skills (in Claude Code)
# /plugin marketplace add forrestchang/andrej-karpathy-skills
```

---

## AI SKILL FILES (Reference Before Building Each Feature)

| Feature | Skill File to Read First |
|---------|-------------------------|
| Chat assistant | `claude/skills/va_expert.md` |
| Document review | `claude/skills/document_reviewer.md` |
| Document generator | `claude/skills/document_writer.md` |
| Community stories | `claude/skills/story_builder_decision_accessibility.md` |
| Decision letter | `claude/skills/story_builder_decision_accessibility.md` |
| Accessibility | `claude/skills/story_builder_decision_accessibility.md` |
| PII detection | `claude/skills/pii_guard.md` |
| Compliance | `claude/skills/compliance_guard.md` |
| Auth + consent + insights | `claude/skills/auth_consent_intelligence.md` |
| Research agents | `claude/skills/research_agents.md` + `research_sub_agent.md` |

---

## KNOWLEDGE BASE SEEDING PRIORITY

Before the AI chat can be useful, seed the Chroma vector store in this priority order:

**Phase 1 (required before launch):**
1. 38 CFR Part 3 (Service Connection) — full text, chunked by section
2. 38 CFR Part 4 (Rating Schedule) — chunked by diagnostic code
3. VA M21-1 Manual key sections — adjudication procedures
4. All DBQ forms — what C&P examiners evaluate per condition
5. Top 50 VA benefits — plain-English eligibility + steps
6. State veteran charging laws — regulatory database (see `claude/skills/final_integration_addendum.md` Section 2)
7. VA Form instructions — 21-526EZ, 21-0781, 21-4138, 21-0966

Script: `scripts/seed-knowledge-base.ts` (implement this)

---

## TESTING REQUIREMENTS (These Gate Phase Completion)

Every phase completion check requires these tests to pass:

```bash
npx turbo test:pii          # 20+ cases, zero false positives on common number patterns
npx turbo test:compliance   # Crisis detection, medical advice, legal advice, guarantees
npx turbo test              # Full test suite across all packages
npx turbo typecheck         # Zero type errors (strict mode)
npx turbo lint              # Zero lint errors
```

**Critical test cases that MUST be in `tests/`:**

PII Scrubber:
- All SSN formats: XXX-XX-XXXX, XXXXXXXXX, XXX XX XXXX
- Should NOT flag: phone numbers (10 digits), VA claim numbers, dates
- Should flag: SSN in natural language ("my SSN is...")
- Credit card numbers (Luhn algorithm)
- VA file numbers

Compliance Engine:
- Crisis: "I don't see the point anymore" → CRISIS_DETECTED
- Non-crisis: "I don't see the point in filing online" → COMPLIANCE_PASSED
- Medical: "You probably have PTSD" → COMPLIANCE_FAILED
- Legal: "You should appeal this decision" → COMPLIANCE_FAILED
- Guarantee: "You'll definitely get 70%" → COMPLIANCE_FAILED

---

## MISSING FEATURES BACKLOG (Build After Core Phases)

These were identified during architecture review (see `claude/skills/final_integration_addendum.md` Section 6). Add to Phase 4 or post-launch sprint:

1. Notification Center (in-app bell, categories, read/unread)
2. Veteran Onboarding Assessment (first-time "Where are you?" questionnaire)
3. VSO Directory & Connector (searchable, VA-accredited reps)
4. C&P Exam Preparation Module (DBQ preview, "worst day" framing)
5. Buddy Letter Request System (shareable link for non-veteran letter writers)
6. Progress Milestones & Achievements
7. Multi-Language Support Architecture (i18n from day one, Spanish first)
8. Audit Trail Dashboard (admin — PII events, moderation actions, deletions)
9. Feedback System (thumbs up/down on AI responses, "report inaccuracy")
10. Emergency Maintenance Mode (crisis line always visible even in maintenance)

---

## DEPLOYMENT TARGETS (When Ready)

| App | Platform | Config |
|-----|----------|--------|
| `apps/web` | Vercel | `VERCEL_TOKEN` required in CI |
| `apps/api` | Railway | `RAILWAY_TOKEN` required in CI |
| Vector DB (Chroma) | DigitalOcean | `CHROMA_HOST` + `CHROMA_PORT` in env |
| Database (PostgreSQL) | Railway (same as API) | `DATABASE_URL` in env |
| Analytics (PostHog) | Self-hosted DigitalOcean | `POSTHOG_API_KEY` + `POSTHOG_HOST` |

CI/CD is GitHub Actions (`.github/workflows/ci.yml` — implement this in Phase 4).

---

## PROGRESS TRACKING

Update `.vetassist-progress.json` after completing each task. Status values: `not_started` → `in_progress` → `completed`.

If a session grows beyond 50K tokens, save state and start a new session. Read `.vetassist-progress.json` at the start of every new session to resume from the correct point.

---

## LEGAL REMINDER (Do Not Deviate)

VetAssist is an **educational platform** and **document writing assistant**. The AI:
- CAN explain what a regulation says in plain English
- CAN describe what evidence types are typically relevant to a condition type
- CAN show veterans what options exist after a denial
- CAN write a personal statement using the veteran's own words (structured by AI)
- CANNOT tell a veteran "you should be rated at X%"
- CANNOT say "file for this specific condition because..."
- CANNOT guarantee outcomes
- CANNOT practice law or medicine

The Compliance Engine enforces this at runtime. The skill files define the prompt guardrails. The Legal Boundary Engine (see full compliance spec) adds explicit detection.

Every AI response that reaches a user has passed through three gates: PII scrubber, Compliance Engine, Legal Boundary check.

---

## IF YOU GET STUCK

1. Check the relevant skill file in `claude/skills/` first
2. Check `docs/architecture.md` for the data flow
3. Check `docs/security_compliance.md` for regulatory requirements
4. Check `docs/ui-design-spec.md` for any UI question
5. The source of truth for all product decisions is `claude/CLAUDE.md` — it contains the owner's exact configuration choices

If a skill file doesn't exist for your current task, write the simplest implementation that:
- Passes all inputs through PII scrubber
- Passes all AI outputs through Compliance Engine
- Uses event-driven communication
- Has zero hardcoded values
- Has a file header

Good luck. Build something veterans are proud to use.
