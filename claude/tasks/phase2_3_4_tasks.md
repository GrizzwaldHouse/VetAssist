# Phase 2 — Education & Document Tools
# Developer: Marcus Daley
# Date: 2026-04-21
# Purpose: Benefits discovery, document generator, document review (Grammarly-style), claims tracker

## PHASE 2 STATUS: IN PROGRESS (started 2026-04-21)
## Prerequisites: Phase 1 complete ✅ — begin Phase 2 after reading document_reviewer.md and document_writer.md skills
## Execution order: 2.5 (upload) → 2.1 (benefits) → 2.2 (review) → 2.3 (generator) → 2.4 (tracker) → 2.6 (sharing)

### Scaffolding already done (2026-04-21)
- ✅ `apps/api/src/routes/documents.ts` — `/api/documents/review` complete (PII gate + crisis detection + CFR scoring via DocumentReviewHandler)
- ✅ `apps/web/src/app/documents/page.tsx` — document review page complete (ScoreRing, category cards, suggestion list, PII modal, scoring mode toggle)
- ✅ `apps/web/src/lib/apiClient.ts` — all Phase 2 HTTP methods pre-wired: `reviewDocument`, `uploadDocument`, `searchBenefits`, `getHiddenGems`, `getBenefitById`, `checkEligibility`
- ✅ `apps/api/package.json` — `@vetassist/knowledge` added as dependency

---

## TASKS

### 2.1 Benefits Discovery Hub
- ✅ `apiClient.searchBenefits`, `getHiddenGems`, `getBenefitById`, `checkEligibility` methods exist in `apps/web/src/lib/apiClient.ts`
- 🔲 Build API routes: `/api/benefits/search`, `/api/benefits/hidden-gems`, `/api/benefits/:id`, `/api/benefits/eligibility`
- 🔲 Populate benefits database — seed 50+ benefits via `npx prisma db seed`
- 🔲 Eligibility checker questionnaire (interactive, results link to benefits)
- 🔲 Hidden Gems carousel on home page
- 🔲 State-specific benefits module with state selector
- 🔲 Source badges: Official VA (green), VSO Verified (blue), Community (yellow)
- 🔲 Each benefit: plain-English eligibility, step-by-step application, official source link

### 2.2 Document Review (Grammarly-Style)
- ✅ `/api/documents/review` POST route — `apps/api/src/routes/documents.ts`
- ✅ `/documents` web page — `apps/web/src/app/documents/page.tsx` (ScoreRing, category breakdown, suggestion list, PII modal, scoring mode toggle)
- ✅ `apiClient.reviewDocument` method wired
- 🔲 Rich text editor with inline highlights and suggestion popups (Phase 2 enhancement)
- 🔲 Suggestion diff view: original (strikethrough red) vs suggested (green highlight)
- 🔲 Accept/Reject per suggestion, Accept All with confirmation
- 🔲 Risk classification: safe (green), moderate (yellow), needs_review (red)
- 🔲 Audit trail: log all accepted/rejected changes with timestamps
- 🔲 Voice-to-document mode: speak → transcribe → PII scrub → structure → veteran approves

### 2.3 Document Generator (Guided Wizard)
- Read: document_writer.md skill before implementation
- Multi-step form wizard for each document type
- Plain-language questions with help tooltips
- Auto-run through Document Review before download
- Export as .docx and .pdf
- Template library with fillable placeholders

### 2.4 Claims Tracker
- Claim cards with status, progress bar, next action
- Timeline view (chronological actions)
- Deadline alerts with countdown (ITF expiration, C&P exams)
- Checklist per claim (what's done, what's needed)
- Export complete claim packet as single PDF bundle

### 2.5 Document Upload System (Drag-and-Drop)
- ✅ `apiClient.uploadDocument(file)` method wired — POSTs to `/api/documents/upload`
- ✅ `DocumentDropZone` UI component exists in `packages/ui-components/src/DocumentDropZone.tsx`
- 🔲 Build `/api/documents/upload` route — multipart/form-data, PII scan, OCR (Tesseract.js), normalize to text
- 🔲 Document tray: multiple files, reorder by dragging, label each file, batch submit
- 🔲 Mobile: camera scan button + native file picker
- 🔲 Accepted formats: PDF, JPEG, PNG, HEIC, TIFF, .docx, .txt
- 🔲 File normalization: convert all to plain text before AI analysis
- 🔲 Camera permission: follow OS-level permission system

### 2.6 Document Sharing
- Direct share only: email, SMS, download — NO share links
- Re-scan for PII before any share action
- Explicit confirmation dialog before sharing
- Share options: email compose (pre-filled with document), SMS with attachment, device download with folder picker

## COMPLETION CRITERIA
- [ ] Benefits directory searchable with 50+ benefits populated
- [ ] Document review produces scored inline suggestions
- [ ] Document generator creates downloadable .docx/.pdf
- [ ] Drag-and-drop upload works with instant preview and batch tray
- [ ] Claims tracker displays timeline and deadline alerts
- [ ] Share produces PII-clean document via email/SMS/download

---

# Phase 3 — Community & Intelligence
# Developer: Marcus Daley
# Date: 2026-04-12

## TASKS

### 3.1 Veteran Stories Community
- Story submission wizard (structured fields: title, category, branch, content, tags)
- Posting options: anonymous, username, verified veteran badge
- Voice-to-text option for story submission
- PII scan before publishing
- AI strategy extraction: auto-generate 2-3 actionable tips from each story
- CFR linking: auto-identify relevant regulations
- Feed layout with filter chips (category, branch, condition)
- Upvote and threaded comment system
- Top Strategies curated page

### 3.2 Content Moderation System
- Layer 1: Auto-filter (toxic-bert + PII scrubber + spam detection)
- Layer 2: Community report button on every post/comment
- Layer 3: Admin moderation queue
- Admin lockdown toggle: switch ALL posts to manual-approval-required
- Moderation dashboard: queue depth, flagged content, action history
- Disclaimer on every story: "Personal experience. Results vary."

### 3.3 VA Decision Letter Explainer
- Read: decision explainer skill before implementation
- PDF/image upload with OCR
- PII scrub BEFORE AI analysis
- Per-condition breakdown cards (granted/denied/deferred)
- Evidence analysis and missing evidence identification
- Options explanation (Supplemental, HLR, Board Appeal)
- Combined rating calculator with VA math visualization
- Export plain-English summary as PDF

### 3.4 Learning Hub
- Curated resource library (videos, articles, guides)
- Categorized by topic and difficulty level
- Seed with Marcus's curated resource list
- AI-extracted key takeaways per resource
- Verified badge for reviewed content

### 3.5 FAQ & Glossary
- Auto-populated from most-asked chatbot questions
- VA terminology glossary with CFR links
- VA website issues workaround guide (ongoing loading screen problem)
- Searchable

### 3.6 VR&E Chapter 31 Guide
- Eligibility checker
- Track explainer (4 tracks with pros/cons)
- Chapter 31 vs Chapter 33 comparison with irrevocable election warning
- Application walkthrough

## COMPLETION CRITERIA
- [ ] Community stories post, display, and extract AI tips
- [ ] Moderation catches toxicity and PII in posts
- [ ] Admin lockdown toggle works
- [ ] Decision letter produces per-condition breakdown
- [ ] Learning hub displays categorized resources
- [ ] FAQ searchable with glossary

---

# Phase 4 — Mobile & Polish
# Developer: Marcus Daley
# Date: 2026-04-12

## TASKS

### 4.1 React Native App
- Initialize Expo project in apps/mobile
- Shared types and utils from packages/
- Bottom tab navigation (5 tabs: Home, Chat, Documents, Discover, Community)
- All screens from web app adapted for mobile
- Camera integration for document scanning (OS-level permissions)
- Push notifications for deadline reminders

### 4.2 Offline Mode
- Service Worker (web) / AsyncStorage (mobile) for cached content
- Cache: benefits pages, FAQ, glossary, learning resources
- Document drafting offline, sync on reconnect
- Clear offline indicator when AI features unavailable

### 4.3 Data Destruction System
- Delete button with confirmation dialog
- Pre-deletion download option (download or send via email/SMS)
- Animated progress bar showing real-time deletion status
- Secure wipe (overwrite + delete, not soft delete)
- Auto-generated deletion certificate (PDF)
- Certificate includes: timestamp, data types, method, certificate ID

### 4.4 Analytics & Grant Reporting
- PostHog integration (self-hosted)
- Consent-required, opt-in only
- Track: feature usage, workflow completion, accessibility adoption (all anonymous)
- Admin dashboard: usage heatmap, funnel analysis, popular benefits
- Grant report generator: veterans served, docs created, benefits discovered (no PII)

### 4.5 Monthly VA Update System
- Automated daily scraper checking eCFR.gov and Federal Register
- Changes collected and batched into monthly update
- Admin review and approval before knowledge base update
- "What Changed This Month" notification to all veterans
- Newsletter generation with plain-English summary of regulatory changes

### 4.6 CI/CD & Security
- GitHub Actions: CI (lint, type check, test, build, deploy)
- Compliance scan: accessibility audit (axe-core), PII detection tests
- Security scan: npm audit, secret detection (git-secrets)
- Content monitor: daily eCFR/Federal Register check

## COMPLETION CRITERIA
- [ ] Mobile app runs on iOS and Android simulators
- [ ] Offline content accessible without internet
- [ ] Data deletion produces certificate with progress bar
- [ ] Analytics dashboard shows anonymous usage metrics
- [ ] Monthly update system detects CFR changes
- [ ] CI/CD pipeline runs all checks on push
