# VetAssist Project Addendum — Final Integration
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Claude Code UI skills, regulatory database, knowledge scraper, archive, communication safety, missing features

---

## 1. CLAUDE CODE UI SKILLS TO INSTALL

Install these skills into the Claude Code project for production-grade UI that doesn't look like generic AI output.

### Required Skills (Install Before Building Any UI)

```bash
# Anthropic's official frontend design skill (277K+ installs)
# Bans generic fonts (Inter, Roboto, Arial), enforces intentional design
claude plugin add anthropic/frontend-design

# UI/UX Pro Max — 55K+ stars, searchable design database
# Color palettes, font pairings, chart types, UX guidelines
claude plugin add anthropic/ui-ux-pro-max

# Code Reviewer (Simplify) — auto-refactors first-draft agent code
claude plugin add anthropic/code-reviewer

# Webapp Testing — Playwright-based UI verification
claude plugin add anthropic/webapp-testing
```

### Additional Skills for VetAssist Specifically

```bash
# From alirezarezvani/claude-skills (232+ skills)
# Copy relevant skills to .claude/skills/
# - accessibility compliance checker
# - landing page builder
# - component library generator

# From obra/superpowers
# 20+ battle-tested skills including TDD, debugging, collaboration
claude plugin add obra/superpowers
```

### Skill Integration Rules
- Frontend Design skill MUST be read before generating ANY UI component
- Every component must pass accessibility skill review (WCAG AA)
- Code Reviewer skill runs on every generated file before commit
- Webapp Testing validates rendered output in headless browser

---

## 2. STATE-BY-STATE VETERAN CHARGING REGULATIONS DATABASE

### Critical: This Must Be In The Knowledge Base

VetAssist needs a regulatory database tracking which states allow/prohibit charging veterans for claims assistance. This is both a compliance safeguard for VetAssist AND educational content for veterans.

### States That BAN Charging Veterans for Claims Assistance (as of April 2026)

| State | Law | Effective | Key Provision |
|-------|-----|-----------|---------------|
| California | SB 694 | Feb 10, 2026 | Prohibits unaccredited companies from charging for VA claims help |
| Maine | (2024 law) | 2024 | Bans for-profit claims consulting fees |
| New Jersey | (2024 law) | 2024 | Bans fees for claims preparation (challenged in court) |
| New York | (2024 law) | 2024 | Restricts for-profit veteran claims consulting |
| + ~7 more states | Various | 2023-2026 | Similar bans enacted |

### States With Ongoing Legislation (2025-2026)
- 17+ states introduced similar bills as of late 2024
- Federal CHOICE for Veterans Act advanced from House Committee on Veterans' Affairs (May 2025)
- Kansas reviewing claim shark regulations (KLRD briefing book 2026)

### States That ALLOW Charging (With Limits)
- Louisiana: PLUS Act allows up to $12,500 in fees (but federal court blocked parts of it)

### Federal Baseline
- 38 U.S.C. § 5904(c)(1): Fees prohibited for services before VA's initial decision
- 38 CFR § 14.636(c): Fees allowed ONLY after initial decision + NOD filed + accreditation
- 38 CFR § 14.632(c)(5)-(6): Charging fees on initial claims = grounds for accreditation cancellation
- VA OGC 2004 Opinion: Educational services and informational tools ARE permitted
- Criminal penalties for unauthorized fees were removed in 2006 (why claim sharks emerged)
- GUARD VA Benefits Act (introduced 2022, 2023): Would reinstate criminal penalties (not yet passed)

### VetAssist Position (Legally Defensible)
VetAssist is:
- An EDUCATIONAL platform (permitted under VA OGC 2004 opinion)
- A document WRITING ASSISTANT (Grammarly-style — not claims preparation)
- COMPLETELY FREE (compliant in all 50 states)
- NOT accredited or representing veterans (no accreditation needed)
- NOT filing claims on behalf of veterans (veterans file their own)

### Implementation
- Add this regulatory database to the RAG knowledge base
- AI can inform veterans about their state's protections
- Warning banner when veterans mention paying for claims help: "Be aware that many states prohibit charging fees for VA claims assistance. Free help is available through VSOs and County Veteran Service Officers."

---

## 3. KNOWLEDGE BASE SCRAPER ARCHITECTURE

### Purpose
Automatically monitor VA regulatory sources, detect changes, filter relevance, update the RAG knowledge base, and archive outdated content.

### Sources to Monitor

| Source | URL/API | Frequency | Content Type |
|--------|---------|-----------|-------------|
| eCFR Title 38 | ecfr.gov/api/versioner/v1 | Daily | CFR amendments |
| Federal Register VA | federalregister.gov/api/v1 (agency: veterans-affairs) | Daily | Proposed/final rules |
| VA.gov Benefits | va.gov/sitemap.xml | Weekly | Benefits pages, policy updates |
| VA M21-1 Manual | va.gov/m21-1 | Monthly | Adjudication procedure changes |
| BVA Decisions | bva.va.gov (selected) | Monthly | Appeal outcomes |
| State Veteran Laws | legiscan.com API or manual review | Monthly | State-level veteran legislation |

### Scraper Pipeline Architecture

```
SCHEDULED_CHECK_TRIGGERED (daily cron)
  │
  ├─→ eCFR Scraper
  │     ├─ Fetch current version of Title 38 sections
  │     ├─ Compare against stored hash of last version
  │     ├─ If changed: extract diff, classify change type
  │     └─ Emit: CFR_CHANGE_DETECTED (section, diff, severity)
  │
  ├─→ Federal Register Scraper
  │     ├─ Query API for VA-related documents since last check
  │     ├─ Filter: proposed rules, final rules, notices
  │     └─ Emit: FR_DOCUMENT_FOUND (type, title, summary, url)
  │
  └─→ VA.gov Sitemap Monitor
        ├─ Fetch sitemap, compare against stored version
        ├─ Identify new/changed URLs
        ├─ Fetch changed pages, extract content
        └─ Emit: VAPAGE_CHANGED (url, content, change_type)

CHANGE_DETECTED events
  │
  ├─→ Relevance Classifier (AI-powered)
  │     ├─ Score relevance 0-1 (is this about benefits, ratings, claims?)
  │     ├─ If < 0.3: archive as low-relevance, skip
  │     ├─ If 0.3-0.7: flag for admin review
  │     └─ If > 0.7: queue for knowledge base update
  │
  ├─→ Deduplication Engine
  │     ├─ Check if this content already exists in knowledge base
  │     ├─ If duplicate with no changes: skip
  │     └─ If updated version of existing content: mark old as ARCHIVED
  │
  └─→ Admin Review Queue
        ├─ Present changes with diff view
        ├─ Admin approves/rejects each change
        ├─ Approved changes: update RAG vector store
        └─ Emit: KNOWLEDGE_BASE_UPDATED (section, timestamp)

MONTHLY_NEWSLETTER_TRIGGER (1st of each month)
  │
  ├─→ Aggregate all approved changes from past month
  ├─→ Generate "What Changed This Month" summary (AI-written, admin-reviewed)
  ├─→ Include: CFR changes, new VA policies, new benefits, state law updates
  └─→ Distribute: in-app notification + opt-in email
```

### Anti-Bloat System (Relevance Filtering)

The knowledge base MUST NOT become bloated with irrelevant information. Rules:

1. **Relevance scoring**: Every document gets a 0-1 relevance score before ingestion
2. **Staleness tracking**: Documents older than 2 years without access are flagged for review
3. **Usage tracking**: Track which knowledge base chunks are actually retrieved in AI responses
4. **Pruning**: Quarterly review of low-usage, low-relevance content — archive or remove
5. **Chunking strategy**: Split large documents into focused chunks (one topic per chunk)
6. **Metadata tagging**: Every chunk tagged with: source, date, CFR section, topic, relevance score

### Storage Budget
- Active knowledge base: target < 50K chunks (manageable for Chroma)
- Archive: unlimited (searchable but not in active RAG retrieval)
- If active exceeds 50K: trigger admin review of lowest-relevance chunks

---

## 4. ARCHIVE SYSTEM

### Purpose
Preserve historical versions of VA regulations, policies, and community content without bloating the active system.

### Archive Types

| Content Type | Archive Trigger | Retention | Searchable? |
|-------------|----------------|-----------|-------------|
| Superseded CFR sections | New version detected | Indefinite | Yes (with "archived" badge) |
| Outdated VA.gov pages | Content changed/removed | 5 years | Yes (with "historical" badge) |
| Retired community insights | Low confidence or outdated data | 3 years | Admin only |
| User-deleted data | Veteran deletes account/data | 30 days (grace period) then destroyed | No |
| Monthly newsletters | Each month | Indefinite | Yes (public) |
| Moderation actions | Content removed/flagged | 2 years | Admin only |

### Archive Features
- **Version history**: For CFR sections, show "this was the regulation on [date]" vs "current regulation"
- **Comparison view**: Side-by-side diff between archived and current versions
- **Citation accuracy**: If a veteran references an old regulation, warn them it may have been updated
- **Restoration**: Admin can restore archived content to active status if needed

### Archive UI
- Archived content displayed with amber banner: "This information was current as of [date]. Check current regulations for the latest version."
- Link to current version always visible
- Search results show archived items below active items with clear visual distinction

---

## 5. COMMUNICATION SAFETY FRAMEWORK (From SPAGHETTI_RELAY)

### Patterns from Marcus's Server Network Project

The SPAGHETTI_RELAY lab covers TCP/IP server connections — binding, listening, accepting connections, and message passing. The architectural patterns applicable to VetAssist's community chat/comment system:

### Server Communication Architecture for Community Features

```
VETERAN CLIENT
  │
  ├─→ WebSocket Connection (real-time notifications, chat updates)
  │     ├─ TLS 1.3 encrypted
  │     ├─ Authenticated (JWT token required)
  │     ├─ Rate limited (prevent spam flooding)
  │     └─ PII scanner on every outbound message
  │
  ├─→ REST API (CRUD operations, document uploads, search)
  │     ├─ Fastify with Zod validation
  │     ├─ Auth middleware on all protected routes
  │     └─ PII middleware on all incoming data
  │
  └─→ Event Stream (SSE for real-time updates without WebSocket overhead)
        ├─ Deadline reminders
        ├─ New community responses to your posts
        └─ Knowledge base update notifications
```

### Anti-Bullying & Safety Measures (Learned from Veteran Community Behavior)

Based on your experience with veteran Facebook groups and the "disgusting behavior" you've witnessed:

1. **Graduated Response System**
   - 1st offense: Warning message (automated, private)
   - 2nd offense: Post removed + 24-hour posting suspension
   - 3rd offense: 7-day posting suspension + admin review
   - 4th offense: Permanent ban from community features (retains access to educational tools)

2. **Pre-Post Safety Checks**
   - Every post passes through: PII scanner → toxicity classifier → spam detector → (if lockdown mode) admin queue
   - Posts mentioning specific veterans by name: flagged for review
   - Posts with aggressive language toward other posters: auto-held for moderation

3. **Protected Categories**
   - Posts attacking based on branch of service: flagged (inter-branch rivalry can turn toxic)
   - Posts questioning someone's veteran status: flagged
   - Posts sharing someone else's PII/medical info: blocked immediately
   - Posts promoting paid claims services: blocked + admin alert (potential claim shark)

4. **Positive Reinforcement**
   - "Helpful Veteran" badge for consistently upvoted contributors
   - "Verified Veteran" badge for DD-214 verified users
   - "Founding Contributor" badge for early adopters
   - Community karma system (visible to user, influences post visibility)

5. **Safe Reporting**
   - Anonymous report button on every post/comment
   - Reporter identity never revealed to the reported user
   - "I'm concerned about this veteran" option that routes to admin with crisis awareness

6. **Rate Limiting for Community**
   - New accounts: 3 posts per day for first 7 days (prevents spam accounts)
   - Established accounts: 10 posts per day
   - Comments: 20 per day
   - Upvotes: unlimited (encourage positive engagement)

---

## 6. FEATURES YOU'RE MISSING (Architecture Gap Analysis)

### Features Not Yet In The Project

1. **Notification Center**
   - In-app notification bell with badge count
   - Categorized: deadlines, community responses, benefit alerts, system updates
   - Read/unread state, bulk mark as read
   - Notification preferences per category

2. **Veteran Onboarding Assessment**
   - First-time "Where are you in the process?" questionnaire
   - Options: "I haven't filed yet", "I filed and got denied", "I want to increase my rating", "I need help understanding my decision letter", "I just want to learn about benefits"
   - Routes veteran to the most relevant feature immediately

3. **VSO Directory & Connector**
   - Searchable directory of VA-accredited VSOs, attorneys, and claims agents
   - Source: VA.gov accredited representative search (va.gov/ogc/apps/accreditation)
   - Filter by location, specialty, organization
   - "Connect" button that generates an email introducing the veteran to the VSO

4. **C&P Exam Preparation Module** (from your original advice to Taylor)
   - "What to expect" walkthrough
   - Condition-specific tips (what the examiner will test for each condition)
   - DBQ preview (show veterans the form the examiner fills out so they know what's being evaluated)
   - "Worst day" framing guidance (your advice: don't push past pain, stay consistent from parking lot to exam)
   - Disclaimer: "These are preparation tips based on veteran experiences. Be honest with your examiner."

5. **Buddy Letter Request System**
   - Veteran generates a "request link" they can send to friends/family
   - The friend/family member opens the link, answers guided questions, and the system generates a draft buddy letter
   - Veteran reviews and downloads the letter
   - No account required for the letter writer (reduces friction for elderly parents, etc.)

6. **Progress Milestones & Achievements**
   - "You've completed your first document review!" celebrations
   - "You've helped 5 fellow veterans in the community!" badge
   - Visual progress tracker: "Your claim readiness: 4 of 7 documents complete"
   - Gentle nudges for abandoned workflows: "You started a personal statement 3 days ago. Ready to finish?"

7. **Multi-Language Support Architecture**
   - i18n framework from day one (even if launching English-only)
   - Content translation pipeline for Spanish (largest non-English veteran population)
   - RTL support foundation for future Arabic translation (significant veteran demographic)

8. **Audit Trail Dashboard (Admin)**
   - Every PII detection event
   - Every moderation action
   - Every data deletion with certificate ID
   - Consent changes (granted/withdrawn)
   - AI compliance engine interventions
   - Knowledge base updates and approvals
   - Useful for grant reporting and compliance audits

9. **Feedback System**
   - "Was this helpful?" on every AI response (thumbs up/down)
   - "Report inaccuracy" button on cited regulations
   - Monthly feedback summary for product improvement
   - Feature request submission (community-voted roadmap)

10. **Emergency Maintenance Mode**
    - Admin toggle that shows "VetAssist is temporarily down for maintenance"
    - Crisis line resources ALWAYS visible even in maintenance mode
    - Cached offline content still accessible
    - Estimated return time display

---

## 7. KNOWLEDGE BASE CONTENT PRIORITY FOR INITIAL SEED

### Must-Have Before Launch (Phase 1)

1. **38 CFR Part 3** (Service Connection) — Full text, chunked by section
2. **38 CFR Part 4** (Rating Schedule) — Full text, chunked by diagnostic code
3. **VA M21-1 Key Sections** — How raters evaluate claims
4. **All DBQ Forms** — What C&P examiners evaluate for each condition
5. **Top 50 VA Benefits** — Plain-English eligibility and application steps
6. **State Veteran Charging Laws** — The regulatory database from section 2 above
7. **VA Form Instructions** — 21-526EZ, 21-0781, 21-4138, 21-0966 (Intent to File)

### Phase 2 Additions
8. **BVA Decision Samples** — 100 representative appeal outcomes by condition type
9. **State-Specific Benefits** — All 50 states, starting with California
10. **PACT Act Presumptives** — Full list of burn pit/toxic exposure presumptive conditions
11. **Camp Lejeune** — Water contamination eligibility and claims process

### Phase 3 Additions
12. **Education Benefits** — GI Bill chapters, VR&E tracks, Vet TEC
13. **Healthcare Benefits** — VA healthcare enrollment, CHAMPVA, dental eligibility
14. **Housing Benefits** — VA home loan, SAH/SHA grants, adapted housing
15. **Employment Benefits** — Veterans Preference, VETS program, SDVOSB certification

---

## 8. UPDATED PROJECT STRUCTURE

Add these new directories to the monorepo:

```
packages/
  scraper/               # Knowledge base scraper and update pipeline
    src/
      ecfr-scraper.ts
      federal-register-scraper.ts
      va-sitemap-monitor.ts
      relevance-classifier.ts
      deduplication-engine.ts
      newsletter-generator.ts
  archive/               # Archive management system
    src/
      archive-manager.ts
      version-history.ts
      comparison-engine.ts
  notifications/          # In-app notification system
    src/
      notification-service.ts
      channels/ (in-app, email, push, sms)
      templates/
  moderation/            # Extended moderation system (replaces basic community moderation)
    src/
      graduated-response.ts
      protected-categories.ts
      karma-system.ts
      report-handler.ts
```

### New Skill Files to Create

```
claude/skills/
  scraper_manager.md      # Rules for knowledge base scraping and relevance filtering
  archive_system.md       # Archive management, version history, staleness tracking
  notification_system.md  # Notification routing, frequency limits, channel preferences
  exam_preparation.md     # C&P exam preparation module content and guardrails
  buddy_request.md        # Buddy letter request link system
```

---

## 9. SECURITY ADDITIONS

### Threat Model for VetAssist

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Veteran submits SSN in chat | High | Critical | 3-layer PII scrubber (client regex → Presidio → AI preprocessor) |
| Claim shark promotes paid services in community | Medium | High | Auto-detect promotional language, block + admin alert |
| Data breach exposing veteran data | Low | Critical | Encrypt at rest, minimize data stored, auto-purge, deletion certificates |
| AI provides medical diagnosis | Medium | High | Compliance engine catches diagnostic language before display |
| Toxic community behavior (bullying) | High | Medium | Graduated response system, admin lockdown toggle, protected categories |
| Scraper ingests misinformation | Low | Medium | Relevance classifier, admin review before knowledge base update |
| Fake veteran accounts posting | Medium | Low | Optional DD-214 verification, community karma system, rate limiting for new accounts |
| AI cites outdated regulation | Medium | High | Version tracking in knowledge base, staleness warnings, monthly updates |
| Legal challenge (claim shark companies) | Low | High | Clear educational-only positioning, no fees, compliance documentation |

### Rate Limiting Specifications

| Endpoint | Free Tier | Authenticated | Notes |
|----------|-----------|---------------|-------|
| /chat | 10/day | 10/day (free for all) | Premium would increase this |
| /documents/review | 3/month | 3/month | Premium would increase this |
| /documents/generate | 1/month | 1/month | Premium would increase this |
| /community/post | N/A | 3/day (new), 10/day (established) | Must be authenticated |
| /community/comment | N/A | 20/day | Must be authenticated |
| /upload | 5/day | 5/day | Per-file limit |
| /decision-letter | 1/month | 1/month | Premium would increase this |
