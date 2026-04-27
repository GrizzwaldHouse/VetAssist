# CLAUDE.md — VetAssist Master Project Instructions
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Master instruction file for Claude Code autonomous execution of the VetAssist project

---

## PROJECT IDENTITY

**Name:** VetAssist — Your AI Battle Buddy for VA Benefits
**Mission:** An education and empowerment platform helping veterans understand the benefits they earned through service. We do NOT coach veterans to pursue specific ratings. We help them understand eligibility, file properly, write clearly, and navigate the system.

**What VetAssist IS:** Educational platform, document quality assistant (Grammarly for VA paperwork), benefits discovery engine, accessibility-first tool, veteran community.
**What VetAssist is NOT:** Law firm, medical provider, claims filing service, guaranteed outcome service, replacement for VSOs/attorneys.

---

## CONFIGURATION (From Veteran Input — DO NOT OVERRIDE)

These decisions were made by the project owner through structured questionnaire. They are final.

### PII & SSN Handling
- **Policy:** ACCEPT uploaded documents containing SSNs
- **Action:** Auto-redact SSN with black-bar overlay BEFORE any AI processing
- **Logging:** Log PII detection events (type, timestamp, action) for admin audit — NEVER log the actual PII value
- **Warning:** Display prominent warning to user after redaction explaining what was found and removed
- **Rationale:** Rejecting documents risks false positives from number confusion, frustrating veterans

### Document Storage
- **Method:** Encrypted temp storage (AES-256) with configurable auto-deletion timer
- **Default timer:** 24 hours auto-purge
- **Veteran choice:** Option to save-for-later (extends to 30 days max)
- **Failsafe:** All orphaned files auto-purged after 30 days regardless of setting
- **Warning:** Display countdown timer showing when files will be destroyed
- **Pre-deletion:** Always offer download before destruction

### AI Scoring Strictness
- **Mode:** ADJUSTABLE — veteran chooses between "Encouraging" and "Strict" mode
- **Encouraging mode:** Highlights improvements needed with supportive language, scores generously
- **Strict mode:** Rates exactly as a VA reviewer would, no sugar-coating, honest feedback
- **Default:** Encouraging mode (can be changed in settings)

### Camera Permissions
- **Policy:** Follow OS-level permission system
- **Implementation:** Use standard platform permission APIs (iOS/Android)
- **No custom permission dialogs** — rely on the OS permission framework for regulatory compliance

### Document Sharing
- **Method:** Direct share ONLY — email, SMS, or file download
- **No share links** — no temporary URLs, no cloud-hosted share pages
- **Consent:** Explicit confirmation before any share action
- **PII scrub:** Re-scan document for PII before sharing

### File Format Support
- **Accepted:** PDF, images (JPEG, PNG, HEIC, TIFF), Word docs (.docx), plain text (.txt)
- **Conversion:** All files normalized to plain text before AI analysis
- **OCR:** Applied to images and scanned PDFs using Tesseract + trocr fallback
- **Token optimization:** Convert to text first, then send to AI — never send raw binary

### Community Moderation
- **Mode:** HYBRID with admin escalation toggle
- **Layer 1:** Auto-filter (PII scrubbing, toxicity detection via toxic-bert, spam detection)
- **Layer 2:** Community reporting (veterans flag problematic content)
- **Layer 3:** Admin moderation queue (reviews auto-flagged + community-reported content)
- **Lockdown mode:** Admin toggle that switches ALL posts to manual-approval-required
- **Rationale:** Veteran communities can become toxic; admin needs ability to lock down during bad periods

### Monetization
- **Model:** COMPLETELY FREE for all veterans
- **Funding:** Grants, donations, sponsorships, veteran nonprofit partnerships
- **Architecture:** Paywall is a CONFIG TOGGLE, not hardcoded — can be enabled later if needed
- **Grant reporting:** Analytics dashboard generates funder-ready metrics (veterans served, docs created, benefits discovered) without PII

### Data Deletion
- **Method:** Instant secure wipe with deletion certificate
- **UX:** Progress bar showing real-time deletion status
- **Pre-deletion:** Download button to save data before destruction
- **Send option:** Share report via email/SMS before deletion
- **Certificate:** Auto-generated PDF proving data was destroyed (timestamp, data types, method)
- **Standard:** Secure wipe (overwrite, not soft delete)

### Offline Mode
- **Scope:** Cache educational content offline (benefits pages, FAQ, glossary, learning resources)
- **AI features:** Require internet — no offline AI processing
- **Document drafting:** Allow offline drafting with sync-on-reconnect
- **Implementation:** Service Worker + IndexedDB for cached content

### Platform Strategy
- **Approach:** Build BOTH simultaneously from day one
- **Web:** Next.js (App Router) with TypeScript
- **Mobile:** React Native with Expo
- **Shared:** Monorepo with shared TypeScript types, validation, and business logic packages
- **95/5 Rule:** 95% of logic in shared packages, 5% platform-specific rendering

### Drag-and-Drop Upload
- **Desktop:** Instant preview + full document tray
- **Behavior:** File drops → thumbnail preview appears instantly → veteran can drop multiple files, reorder, label each one → confirm before analysis
- **Mobile:** Camera scan or native file picker (no drag-and-drop on mobile)

### Document Score Display
- **Format:** Percentage score (0-100%) with animated progress ring
- **Style:** Grammarly-inspired circular score with color gradient (red → yellow → green)
- **Breakdown:** Category scores below the ring (Specificity, Completeness, VA Alignment, PII Safety)

### VA Regulation Updates
- **Frequency:** Monthly curated updates with admin review
- **Monitoring:** Daily automated checks of eCFR.gov and Federal Register
- **Changes collected:** Batched into monthly update cycle
- **Newsletter:** "What Changed This Month" notification to all veterans with summary of regulatory changes
- **Process:** Automated detection → admin review → knowledge base update → veteran notification

---

## CODING STANDARDS (Marcus Daley Universal Standards — STRICTLY ENFORCED)

### The 95/5 Rule
95% of code must be reusable across projects without modification. Only 5% is project-specific configuration. Core logic in shared packages, platform-specific code only in rendering layers.

### Access Control
- Every property has the MOST RESTRICTIVE access level that allows it to function
- Public state is READ-ONLY (getters only, no public setters for mutable state)
- BANNED: Any unrestricted public mutable state

### Initialization
- ALL defaults set at point of construction — never scattered
- ZERO magic numbers or magic strings — use named constants or config
- Initialize all variables at declaration

### Communication
- Event-driven architecture ONLY — Observer pattern for all cross-system state changes
- NEVER poll in loops/timers to detect state changes
- Clean up all subscriptions/listeners on component destruction

### Comments
- Single-line comments only (//) — NEVER block comments (/* */)
- Comments explain WHY, never WHAT
- File headers required: filename, developer, date, purpose

### Dependencies
- Minimize imports in interface files
- Dependency injection over hardcoded instantiation
- Composition over inheritance

### Error Handling
- Validate inputs at system boundaries
- Typed errors — never generic catch-all
- Fail fast and explicitly — never silently corrupt state

---

## TECH STACK (FIXED — DO NOT SUBSTITUTE)

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Mobile Frontend | React Native (Expo), TypeScript, NativeWind |
| Backend API | Node.js (Fastify), TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Vector DB | Chroma (self-hosted) for RAG knowledge base |
| Primary AI | Anthropic Claude API (claude-sonnet-4-6 for reasoning, claude-haiku-4-5-20251001 for classification) |
| PII Detection | Client-side regex + Microsoft Presidio + Hugging Face pii-entity-extractor |
| Content Moderation | Hugging Face unitary/toxic-bert |
| Speech-to-Text | Web Speech API (free tier) + OpenAI Whisper (premium) |
| Text-to-Speech | Web Speech API (free tier) + WhisperSpeech (premium) |
| OCR | Tesseract.js + microsoft/trocr-large-printed fallback |
| Analytics | PostHog (self-hosted, privacy-first) |
| Auth | Auth0 (free tier) |
| Hosting | Vercel (web) + Railway (API) + DigitalOcean (vector DB) |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo |

---

## PROJECT STRUCTURE

```
vetassist/
├── claude/
│   ├── CLAUDE.md                    # This file
│   ├── skills/                      # AI prompt skill definitions
│   │   ├── va_expert.md
│   │   ├── document_reviewer.md
│   │   ├── document_writer.md
│   │   ├── story_builder.md
│   │   ├── decision_explainer.md
│   │   ├── compliance_guard.md
│   │   ├── pii_guard.md
│   │   ├── accessibility.md
│   │   └── auth_consent_intelligence.md
│   └── tasks/                       # Execution task definitions
│       ├── phase1_foundation.md
│       ├── phase2_education.md
│       ├── phase3_community.md
│       └── phase4_mobile.md
├── environment/
│   ├── .env.example
│   └── config-documentation.md
├── apps/
│   ├── web/                         # Next.js web application
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages
│   │   │   ├── components/          # Web-specific components
│   │   │   └── lib/                 # Web-specific utilities
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   ├── mobile/                      # React Native (Expo) app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   └── navigation/
│   │   ├── app.json
│   │   └── package.json
│   └── api/                         # Fastify backend API
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── middleware/
│       │   │   ├── pii-scrubber.ts
│       │   │   ├── compliance-engine.ts
│       │   │   └── auth.ts
│       │   ├── models/
│       │   └── plugins/
│       └── package.json
├── packages/
│   ├── shared-types/                # TypeScript types shared across all apps
│   │   ├── src/
│   │   │   ├── documents.ts
│   │   │   ├── benefits.ts
│   │   │   ├── community.ts
│   │   │   ├── compliance.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── shared-utils/                # Shared business logic
│   │   ├── src/
│   │   │   ├── pii-detector.ts
│   │   │   ├── ssn-patterns.ts
│   │   │   ├── score-calculator.ts
│   │   │   └── cfr-citation-parser.ts
│   │   └── package.json
│   ├── shared-config/               # Shared configuration
│   │   ├── src/
│   │   │   ├── app-config.ts
│   │   │   ├── feature-flags.ts
│   │   │   └── constants.ts
│   │   └── package.json
│   ├── ai-engine/                   # AI orchestration layer
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── rag-pipeline.ts
│   │   │   ├── compliance-checker.ts
│   │   │   ├── prompt-loader.ts
│   │   │   └── handlers/
│   │   │       ├── chat-handler.ts
│   │   │       ├── document-review-handler.ts
│   │   │       ├── story-builder-handler.ts
│   │   │       └── decision-letter-handler.ts
│   │   └── package.json
│   ├── auth/                        # Authentication, sessions, bot protection
│   │   └── src/
│   ├── consent/                     # Consent engine, scope management, data lifecycle
│   │   └── src/
│   ├── community/                   # Testimonials, moderation, upvotes, comments
│   │   └── src/
│   ├── insights/                    # Pattern detection, clustering, insight generation
│   │   └── src/
│   ├── reports/                     # PDF generation, email digest, newsletters
│   │   └── src/
│   └── ui-components/               # Shared UI component library
│       ├── src/
│       │   ├── CrisisLineBanner.tsx
│       │   ├── PIIWarningModal.tsx
│       │   ├── ScoreRing.tsx
│       │   ├── DocumentDropZone.tsx
│       │   ├── AccessibilityControls.tsx
│       │   ├── AIDisclosureBanner.tsx
│       │   └── index.ts
│       └── package.json
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── compliance.md
│   ├── data-handling.md
│   └── developer-onboarding.md
├── tests/
│   ├── pii-scrubber.test.ts
│   ├── compliance-engine.test.ts
│   ├── document-scoring.test.ts
│   ├── upload-flow.test.ts
│   └── deletion-system.test.ts
├── scripts/
│   ├── seed-knowledge-base.ts
│   ├── check-cfr-updates.ts
│   └── generate-deletion-certificate.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── compliance-check.yml
│       ├── content-monitor.yml
│       └── security-scan.yml
├── turbo.json
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## EXECUTION RULES FOR CLAUDE CODE

1. Read the relevant skill file BEFORE implementing any feature
2. Read the relevant task file for the current phase
3. Follow coding standards strictly — NO exceptions
4. Every file gets a header comment (filename, developer, date, purpose)
5. Event-driven architecture — NO polling anywhere
6. All config values from environment variables or config files — ZERO hardcoded values
7. PII scrubber runs on EVERY text input and file upload — no exceptions
8. Crisis detection (suicide/self-harm keywords) triggers Veterans Crisis Line display IMMEDIATELY
9. AI disclosure banner present on EVERY AI-powered screen
10. All AI responses pass through Compliance Engine BEFORE reaching the user
11. Tests written for every core function — behavior-driven, mock external services only
12. Commit working state with descriptive messages after each meaningful change

---

## LEAN CONTEXT STRATEGY (Inspired by lean-ctx)

- Use scoped context — only load the skill/task files relevant to the current phase
- Prefer `map` mode for file reads when understanding structure (don't load full files unnecessarily)
- Compress diagnostic output — filter noise from build/test output
- Session handoff: if context grows too large, save structured state and start fresh (inspired by clauditor's session rotation pattern)
- Token budget awareness: prefer generating modular files over monolithic ones

---

## SESSION MANAGEMENT (Inspired by clauditor)

- Track token usage per phase — if a phase exceeds 50K tokens, break into sub-phases
- Persist phase completion state to a `.vetassist-progress.json` file
- On session restart, read progress file and resume from last completed phase
- Error recovery: if a file generation fails, log the error and retry with simplified approach
- Never regenerate files that already exist and pass validation
