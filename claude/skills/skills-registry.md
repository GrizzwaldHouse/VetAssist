# VetAssist Skills Registry
# Developer: Marcus Daley
# Date: 2026-04-26
# Purpose: Master registry of all Claude Code skills available for this project.
# Read this before starting ANY implementation task to know which skills to apply.
# Skills live at C:\ClaudeSkills\ (local) and the repos listed below.
#
# PHASE STATUS (as of 2026-04-26):
#   Phase 1 — COMPLETE (13/13 packages, 22 PII tests + 15 compliance tests passing)
#   Phase 2 — COMPLETE (6/6 tasks: upload, benefits, inline review, generator, claims, sharing)
#   Phase 3 — IN PROGRESS (5/6 tasks complete)
#     ✅ 3.1 Veteran Stories Community
#     ✅ 3.2 Content Moderation System
#     ✅ 3.3 VA Decision Letter Explainer
#     ✅ 3.4 Learning Hub (12 curated resources, filter/search)
#     ✅ 3.5 FAQ & Glossary (22 FAQ entries, 32 glossary terms, 5 VA workarounds)
#     🔲 3.6 VR&E Chapter 31 Guide — NEXT
#   Phase 4 — NOT STARTED (Mobile + Polish)

---

## SKILL SOURCES

| Source | Location | Install |
|--------|----------|---------|
| **cowork-skills** | `C:\ClaudeSkills\skills\` | Already installed — `git pull && .\setup.ps1` to update |
| **ui-ux-pro-max** | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `npm install -g uipro-cli && uipro init --ai claude --global` |
| **karpathy-skills** | https://github.com/forrestchang/andrej-karpathy-skills | `/plugin marketplace add forrestchang/andrej-karpathy-skills` |

---

## MANDATORY SKILLS FOR VETASSIST

These are non-negotiable. Every session that touches the corresponding concern MUST apply these skills.

### TIER 1 — Always Active (Background, Auto-Loaded)

| Skill | Location | Applies To |
|-------|----------|------------|
| `universal-coding-standards` | `C:\ClaudeSkills\skills\universal-coding-standards\` | ALL code — access control, Observer pattern, no polling, no magic strings |
| `architecture-patterns` | `C:\ClaudeSkills\skills\architecture-patterns\` | ALL architecture — event-driven, composition, repository pattern |
| `enterprise-secure-ai-engineering` | `C:\ClaudeSkills\skills\enterprise-secure-ai-engineering\` | ALL code — OWASP, NIST SSDF, dependency hygiene, AI code governance |
| `dev-workflow` | `C:\ClaudeSkills\skills\dev-workflow\` | ALL sessions — brainstorm-first, session management, debugging |
| `karpathy-skills` | https://github.com/forrestchang/andrej-karpathy-skills | ALL sessions — think before coding, simplicity first, surgical changes, goal-driven execution |

### TIER 2 — UI/UX Work (Any Frontend Task)

These apply whenever ANY frontend code is being written. The problem with the initial UI spec is that it lacked a binding design point-of-view. These skills enforce one.

| Skill | Location | What It Enforces |
|-------|----------|-----------------|
| `frontend-design` | `C:\ClaudeSkills\skills\frontend-design\` | **ANTI-SLOP ENFORCEMENT** — bans Inter/Roboto/Arial, bans purple gradients on white, requires a committed conceptual direction, demands one unforgettable visual choice per screen |
| `design-system` | `C:\ClaudeSkills\skills\design-system\` | Color theory (60-30-10 rule), typography scale, WCAG contrast ratios, grid/spacing, layout composition |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 161 reasoning rules, 67 UI styles (glassmorphism, bento grid, editorial, brutalist, etc.), 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types |

**UI component workflow — follow this every time:**
1. Read `docs/ui-design-spec.md` for the component spec
2. Apply `frontend-design` skill: commit to a conceptual direction BEFORE writing any code
3. Apply `ui-ux-pro-max` skill: select the appropriate style, color palette, and font pairing
4. Apply `design-system` skill: validate contrast ratios, spacing grid, typography scale
5. Build the component
6. Run `verified-build-gate` skill
7. Run `beta-team-ui-tester` skill to validate rendered output

### TIER 3 — Backend / Security Work

| Skill | Location | Applies To |
|-------|----------|------------|
| `enterprise-secure-ai-engineering` | `C:\ClaudeSkills\skills\enterprise-secure-ai-engineering\` | API routes, auth, data handling, PII pipeline |
| `superpowers-workflow` | `C:\ClaudeSkills\skills\superpowers-workflow\` | TDD for PII scrubber + compliance engine tests, systematic debugging |
| `verified-build-gate` | `C:\ClaudeSkills\skills\verified-build-gate\` | Before every phase completion check |

### TIER 4 — Research & Knowledge

| Skill | Location | Applies To |
|-------|----------|------------|
| `deep-research` | `C:\ClaudeSkills\skills\deep-research\` | VA regulation research, CFR lookup, knowledge base seeding |
| `autoresearch` | `C:\ClaudeSkills\skills\autoresearch\` | Autonomous experiment loops for knowledge scraper tuning |
| `context-optimization` | `C:\ClaudeSkills\skills\context-optimization\` | Session management when context grows large (>50K tokens) |

---

## SKILL APPLICATION MAP (Feature → Required Skills)

| VetAssist Feature | Skills to Read First | Status |
|-------------------|---------------------|--------|
| Any UI component | `frontend-design` + `ui-ux-pro-max` + `design-system` | Phase 1 built — UI refactor pending (`claude/prompts/vetassist-ui-refactor.json`) |
| PII Scrubber | `enterprise-secure-ai-engineering` + `superpowers-workflow` (TDD) | ✅ COMPLETE — `packages/pii/` + 22 tests |
| Compliance Engine | `enterprise-secure-ai-engineering` + `superpowers-workflow` (TDD) | ✅ COMPLETE — `packages/compliance/` + 15 tests |
| Legal Boundary Engine | `enterprise-secure-ai-engineering` + `universal-coding-standards` | ✅ COMPLETE — `packages/legal/` |
| AI Chat Handler | `universal-coding-standards` + `architecture-patterns` (event-driven) | ✅ COMPLETE — `packages/ai/src/ChatPipeline.ts` |
| Document Review (Grammarly-style) | `frontend-design` + `document_reviewer.md` | ✅ COMPLETE — `packages/ai/handlers/DocumentReviewHandler.ts` + `/documents` page |
| Document Upload (drag-and-drop) | `enterprise-secure-ai-engineering` + `pii_guard.md` | ✅ COMPLETE — `packages/upload/` (AES-256, OCR, 24h TTL) |
| Benefits Discovery | `va_expert.md` + `frontend-design` | ✅ COMPLETE — `packages/benefits/` (56 benefits, eligibility checker, hidden gems) |
| Document Generator | `document_writer.md` | ✅ COMPLETE — `packages/ai/handlers/DocumentWriterHandler.ts` + `/generate` page |
| Claims Tracker | `universal-coding-standards` + `architecture-patterns` | ✅ COMPLETE — `packages/claims/` (in-memory MVP, deadlines, checklist) |
| Document Sharing | `enterprise-secure-ai-engineering` + `pii_guard.md` | ✅ COMPLETE — `packages/ai/src/SharingService.ts` (email/SMS/download, PII re-scan) |
| Veteran Stories Community | `story_builder_decision_accessibility.md` | ✅ COMPLETE — `packages/community/` + `/community` page |
| Content Moderation | `enterprise-secure-ai-engineering` + `architecture-patterns` | ✅ COMPLETE — `packages/moderation/` (toxic-bert, spam, admin queue) |
| Decision Letter Explainer | `story_builder_decision_accessibility.md` | ✅ COMPLETE — `packages/ai/handlers/DecisionLetterHandler.ts` + `/decision-letter` page |
| Learning Hub | `va_expert.md` + `frontend-design` | ✅ COMPLETE — `/api/learning` + `/learn` page (12 curated resources) |
| FAQ & Glossary | `va_expert.md` | ✅ COMPLETE — `apps/api/src/routes/faq-glossary.ts` + `/faq` + `/glossary` pages |
| VR&E Chapter 31 Guide | `va_expert.md` + `story_builder_decision_accessibility.md` | 🔲 NEXT — Phase 3 Task 3.6 |
| Knowledge Base Seeding | `deep-research` + `autoresearch` | Phase 3 — NOT STARTED |
| Auth / Consent Engine | `enterprise-secure-ai-engineering` + `auth_consent_intelligence.md` | Phase 4 — NOT STARTED |
| Mobile App (React Native) | `universal-coding-standards` + `architecture-patterns` | Phase 4 — NOT STARTED |
| Offline Mode | `universal-coding-standards` + `architecture-patterns` | Phase 4 — NOT STARTED |
| Data Destruction System | `enterprise-secure-ai-engineering` | Phase 4 — NOT STARTED |
| Analytics (PostHog) | `enterprise-secure-ai-engineering` | Phase 4 — NOT STARTED |
| Monthly VA Update Scraper | `research_agents.md` + `deep-research` | Phase 4 — NOT STARTED |
| CI/CD + Security Hardening | `enterprise-secure-ai-engineering` | Phase 4 — NOT STARTED |
| Any phase completion | `verified-build-gate` | Run before closing each phase |
| Session > 50K tokens | `context-optimization` | Run when context grows large |

---

## THE ANTI-SLOP STANDARD (Read This Before ANY UI Work)

The initial UI output for VetAssist was generic AI output — no design point-of-view, no memorable aesthetic choice, functional but forgettable. This is not acceptable.

**From the `frontend-design` skill:**
> "NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character."

**VetAssist design direction mandate:**
VetAssist serves veterans — people who have operated in high-stakes, high-precision environments. The design language must reflect that: **controlled authority with human warmth**. Not clinical. Not bureaucratic. Not startup-generic.

Committed aesthetic direction for VetAssist UI:
- **Tone:** Quiet authority. Serious but not cold. Like a well-designed service org, not a SaaS dashboard.
- **Typography:** A sturdy slab serif for headings (weight and precision). Humanist sans-serif for body (readable at 18px+, warm not sterile). Examples: Zilla Slab + Source Sans 3, or Playfair Display + Lora, or Bitter + Open Sans.
- **Color:** Dark olive/charcoal base (not midnight blue, not dark gray — olive signals service). Warm off-white text. A single sharp accent (amber or muted gold) for action states only.
- **Motion:** Purposeful only. No decorative animations. Reduced-motion respected everywhere.
- **Differentiator:** The one thing veterans remember — the ScoreRing. It must feel precision-engineered, like a calibration instrument, not a web UI widget.

**Apply `ui-ux-pro-max` style keywords for VetAssist:** "Editorial/Magazine" for information density, "Utilitarian/Military" for structural elements, "Refined Minimalism" for breathing room between complex content blocks.

---

## UI REFACTOR PROMPT

**`claude/prompts/vetassist-ui-refactor.json`** — The complete design system refactor prompt in Claude Design JSON format. Feed this directly to Claude to rebuild all UI components using the military heritage aesthetic. Contains:
- Full `Stars & Field` color palette with WCAG validation
- Oswald + Source Serif 4 typography stack
- Flag texture and grain atmosphere techniques
- Per-component refactor specs (ScoreRing, CrisisLineBanner, DocumentDropZone, etc.)
- Karpathy-style success/failure criteria
- Step-by-step execution instructions

---

## SKILL INSTALLATION STATUS

Run these to check/install:

```bash
# Check cowork-skills (should already be installed globally)
ls ~/.claude/skills/ | grep -E "frontend-design|design-system|enterprise-secure|universal-coding"

# Install/update cowork-skills
cd "C:\ClaudeSkills" && git pull && .\setup.ps1

# Install ui-ux-pro-max
npm install -g uipro-cli
uipro init --ai claude --global

# Install karpathy-skills
# In Claude Code: /plugin marketplace add forrestchang/andrej-karpathy-skills
```

---

## VETASSIST-SPECIFIC AI SKILL FILES

These are prompt engineering skill files that define how Claude approaches VA-domain tasks. Different from the Claude Code skills above — these live in `claude/skills/` and are loaded as context, not as installed plugins.

| File | When to Load |
|------|-------------|
| `claude/skills/va_expert.md` | Before implementing chat handler or any VA content |
| `claude/skills/document_reviewer.md` | Before implementing document review feature |
| `claude/skills/document_writer.md` | Before implementing document generator |
| `claude/skills/pii_guard.md` | Before implementing PII scrubber |
| `claude/skills/compliance_guard.md` | Before implementing compliance engine |
| `claude/skills/story_builder_decision_accessibility.md` | Before implementing community stories, decision letter explainer, or any accessibility work |
| `claude/skills/auth_consent_intelligence.md` | Before implementing auth, consent engine, insight engine, or reports |
| `claude/skills/research_agents.md` | Before implementing knowledge base scraper |
