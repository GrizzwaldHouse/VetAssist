# VetAssist UI Design Specification
# Developer: Marcus Daley
# Date: 2026-04-20
# Purpose: Complete UI design spec for frontend implementation after backend is complete.
# This document is the source of truth for all visual and interaction design decisions.
# Read this before writing a single line of UI code.

---

## DESIGN PHILOSOPHY

**The Grandparent Test:** Every screen must be usable by a 75-year-old veteran who has never used a smartphone beyond phone calls. If they cannot figure out what to do within 5 seconds, the design has failed.

**Trauma-Informed Design:** Veterans using this platform may be dealing with PTSD, TBI, pain, and bureaucratic frustration. Every interaction must be calm, clear, and never time-pressure-based. Error messages must never feel like failures — they are redirections.

**Low-Stimulation Default:** Minimal animations, muted color palette, dark mode required. Veterans with TBI can experience sensory overload from bright colors and motion.

---

## DESIGN SYSTEM

### Typography

**DO NOT use Inter, Roboto, or Arial.** These are generic and convey no trust or character.

**Primary Typeface:** Georgia (web-safe fallback for body) or a serif with strong legibility
**Heading Typeface:** A sturdy slab serif — evokes authority and trustworthiness (military precision)
**Mono:** JetBrains Mono for any data, form values, certificate IDs

**Scale:**
- Body: 18px default (adjustable 16–36px via Accessibility FAB)
- H1: 32px
- H2: 24px
- H3: 20px
- Small / captions: 14px minimum (never smaller)
- Line height: 1.6 for body, 1.3 for headings

### Color Palette

**Do NOT use VA.gov blue or any implication of being an official government site.**

```
/* Core — Dark Mode Primary (default) */
--surface-base:       #0f1117   /* Near-black background */
--surface-raised:     #1a1f2e   /* Card/panel level */
--surface-overlay:    #242b3d   /* Tooltip, modal level */

/* Text */
--text-primary:       #e8eaf0   /* Main content */
--text-secondary:     #9aa3b8   /* Subtitles, captions */
--text-muted:         #5c6478   /* Placeholders, disabled */

/* Accent — Military Olive (trust, service) */
--accent-primary:     #8d9c5e   /* Primary actions, links */
--accent-primary-hover: #a3b36e

/* Status Colors */
--status-safe:        #4caf79   /* Green — passing score, approved */
--status-caution:     #e8a838   /* Amber — moderate risk, review */
--status-alert:       #e05252   /* Red — crisis, failed, blocked */
--status-info:        #5b8dee   /* Blue — informational */

/* Crisis Line — ALWAYS this specific red */
--crisis-banner:      #c0392b   /* Non-negotiable — visibility in crisis */
--crisis-text:        #ffffff

/* Score Ring Gradient */
--score-low:          #e05252   /* 0–39% */
--score-mid:          #e8a838   /* 40–69% */
--score-high:         #4caf79   /* 70–100% */

/* Light Mode (secondary, accessible via toggle) */
--surface-base-light:    #f5f7fa
--surface-raised-light:  #ffffff
--text-primary-light:    #1a1f2e
--accent-primary-light:  #5a6e2e
```

### Spacing

8px grid. All spacing is a multiple of 8.
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Border Radius
- Cards: 12px
- Buttons: 8px
- Chips/Tags: 100px (pill)
- Inputs: 8px
- Modals: 16px

### Shadows (Dark Mode)
```css
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.4);
--shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.7);
--shadow-focus: 0 0 0 3px var(--accent-primary);   /* Focus ring */
```

---

## MANDATORY PERSISTENT UI ELEMENTS

These appear on EVERY screen, no exceptions.

### 1. Crisis Line Banner (CrisisLineBanner)
- Position: Sticky top, above navigation
- Height: 44px
- Background: `--crisis-banner` (#c0392b)
- Text: "Veterans Crisis Line: Call 988 Press 1 | Text 838255 | Chat at VeteransCrisisLine.net"
- Font: 14px bold, white
- Entire banner is tappable (opens dialer / chat link)
- NEVER dismissable, NEVER hidden, NEVER reduced
- In maintenance mode: this banner is the ONLY thing visible

### 2. AI Disclosure Banner (AIDisclosureBanner)
- Position: Below navigation on AI-powered screens only
- Background: `--surface-raised` with left border in `--status-info`
- Text: "VetAssist uses AI to provide educational information. This is not legal or medical advice. For claim-specific help, contact a VA-accredited VSO."
- Dismiss: User can collapse per session (not per page load)
- Collapsed state: thin colored border remains to indicate AI content

### 3. Accessibility FAB (AccessibilityControls)
- Position: Fixed bottom-right, above any tab bar
- Icon: Accessibility symbol (♿ or custom wheelchair icon)
- Touch target: 56x56px
- Opens bottom sheet with:
  - Font size slider (16–36px, shows live preview)
  - Dark/Light mode toggle
  - High contrast mode toggle
  - "Read Page Aloud" button (triggers TTS for entire page)
  - Reduce Motion toggle

---

## NAVIGATION ARCHITECTURE

### Web App (Desktop/Tablet)
- **Sidebar navigation** (collapsed to icon-only on small screens)
- Top slots: Logo, Crisis Banner
- Nav items (5): Home, Chat, Documents, Discover, Community
- Bottom slots: Settings, Profile, Accessibility FAB
- Max 2 levels of nesting — if a feature needs a third level, redesign it

### Web App (Mobile breakpoint, <768px)
- Bottom tab bar (5 tabs matching above)
- Top bar: Logo + notification bell + hamburger for secondary nav
- Crisis Banner stays at top, above tab content area

### Mobile App (React Native)
- Bottom Tab Navigator (5 tabs)
- Crisis Banner as a Pressable above tabs
- Each tab has a Stack Navigator for internal navigation

---

## SCREEN DESIGNS

### Home Screen
Layout:
1. Crisis Banner (sticky)
2. Welcome message: "Good morning, [displayName or 'Veteran']" — warm, first-name if known
3. Onboarding assessment card (first visit only) — "Where are you in your VA journey?"
4. Quick Actions row: [Chat with AI] [Review a Document] [Explore Benefits] [My Claims]
5. Hidden Gems carousel (2-3 benefits veterans often miss)
6. Community highlight (most upvoted story this week)
7. What Changed This Month (if applicable, dismissed until next month)

### Chat Screen
Layout:
1. AI Disclosure Banner
2. Message list (newest at bottom, auto-scroll)
3. Message bubble styles:
   - User: right-aligned, `--accent-primary` background
   - AI: left-aligned, `--surface-raised` background
   - AI bubbles include a source chip row below them (tappable → opens CFR section)
   - AI bubbles include a "Read Aloud" icon button
4. Input area (pinned bottom):
   - Text field with PII scanning indicator (subtle pulsing border when scanning)
   - Microphone button (STT)
   - Send button
5. Suggested follow-ups: chip row above input that populates the text field on tap
6. When crisis keywords detected: overlay that INTERRUPTS — full-screen, crisis line only

### Document Review Screen
Layout:
1. Upload zone (left panel / top section):
   - Drag-and-drop on desktop: dashed border, "Drop files here" with file icon
   - Preview tray below (shows thumbnails, drag to reorder, label each)
   - Mobile: "Scan Document" (camera) or "Pick File" buttons
2. Review panel (right panel / below on mobile):
   - Score Ring: animated circle, 0–100%, color gradient, category breakdown below
   - Categories: Specificity, Completeness, VA Alignment, PII Safety — each with sub-score
3. Document editor:
   - Highlighted text for suggestions (green = recommended change, yellow = optional, red = risk)
   - Click/tap a highlight → popup with suggestion, original vs suggested diff
   - Accept / Reject buttons in popup
   - Accept All button (requires confirmation dialog)
4. After all suggestions processed: export buttons (.docx, .pdf)
5. Audit trail: collapsible section showing accepted/rejected history with timestamps

### Document Generator Screen (Wizard)
- Progress bar at top (step X of Y)
- One question per step — large text, clear label, help tooltip available
- Navigation: Back / Next / Skip (optional fields)
- Final step: summary review, then auto-run through Document Review before download

### Benefits Discovery Screen
- Search bar (prominent, auto-focus on enter)
- Filter chips: Education, Healthcare, Housing, Employment, Community, Financial
- Source badges next to each benefit title: Official VA (green dot), VSO Verified (blue dot), Community (yellow dot)
- Benefit card: title, plain-English eligibility summary, "Learn More" → detail page
- Hidden Gems section: flagged by curators, visually distinct (star badge)
- State-specific benefits: state selector dropdown at top

### Decision Letter Explainer
- Upload zone: accepts PDF and images
- Processing state: progress bar with text "Scanning for PII... Done. Analyzing decision..."
- Results layout:
  - Summary card: "VA decided on X conditions: Y approved, Z denied, W deferred"
  - Per-condition cards (accordion or tabs):
    - Decision badge: GRANTED (green) / DENIED (red) / DEFERRED (amber)
    - Plain-English reasoning
    - Evidence cited vs missing
    - Effective date, rating percentage
  - Options section (neutral): Supplemental Claim, HLR, Board Appeal — with deadlines
  - Combined Rating Calculator: interactive, visual VA math
- Export: "Download Plain-English Summary (PDF)"

### Veteran Stories (Community)
- Feed layout: story cards with title, category chip, branch badge, upvote count
- Filter chips at top: All, C&P Exam Tips, Evidence, Appeals, Benefits Discovery
- Story card: AI-extracted tip chip below title ("1 strategy extracted")
- Story detail: full narrative + 2–3 AI-extracted tips + CFR links + disclaimer + comments
- Submit button (requires auth + community consent)
- Report button: icon on each post, anonymous, never revealed to reporter

### Claims Tracker
- Card per claim: condition name, status badge, progress bar (Pending / C&P Scheduled / Decision)
- Timeline tab: chronological history of actions
- Deadline alerts: red countdown badge when < 30 days remain
- Checklist: required documents, each with check state
- Export: "Generate Claim Packet (PDF)" — bundles everything

### Settings Screen
- Profile section: displayName (optional), branch/role (optional, with branch-correct terminology)
- Accessibility: same controls as FAB (duplicated here for discoverability)
- Privacy + Consent: granular toggles for analytics, research, community
- Notifications: per-category toggles (deadlines, community responses, benefit alerts, monthly update)
- Document Storage: current TTL timer, extend to 30 days option, delete now option
- Account: Download My Data, Delete All My Data (with confirmation + certificate)
- Scoring Mode: Encouraging (default) / Strict toggle
- AI Scoring Strictness explanation tooltip

### Data Deletion Flow
1. "Delete All My Data" button → confirmation dialog (1st)
2. Offer download: "Before we delete everything, would you like to download your data?" [Download] [Skip]
3. Second confirmation: "This will permanently and securely destroy all your data. This cannot be undone." [Cancel] [Delete Everything]
4. Progress screen: animated progress bar, "Securely wiping documents... Removing profile data... Clearing consent records..."
5. Completion: "Done. Your deletion certificate has been generated." [Download Certificate PDF]

---

## COMPONENT SPECIFICATIONS

### ScoreRing
```
- SVG circle, 120px diameter (web), 100px (mobile)
- Stroke width: 10px
- Background track: --surface-overlay
- Foreground: gradient from --score-low → --score-mid → --score-high based on value
- Animated: stroke-dasharray animates from 0 to value on mount
- Center text: percentage in bold, category label below in --text-secondary
- respects prefers-reduced-motion: no animation if reduced motion preferred
```

### PIIWarningModal
```
- Full overlay (not corner toast) — this is serious
- Icon: warning triangle in --status-alert
- Title: "Sensitive Information Detected"
- Body: "We found [SSN / credit card / VA file number] in your document and automatically covered it. Your information is protected."
- Action: [OK, Continue] — closes modal, document is already redacted
- Never shows the actual PII value — ever
```

### DocumentDropZone
```
- Dashed border (2px, --text-muted)
- On hover/drag-over: border becomes --accent-primary, background shifts slightly
- On drop: instant thumbnail preview appears below zone
- Thumbnail tray: horizontal scroll, each thumbnail has label input and remove button
- Accepted file types shown below zone: "PDF, JPG, PNG, HEIC, TIFF, DOCX, TXT"
- Max size shown: "Max 25 MB per file"
- Mobile: hidden (replaced by Scan/Pick buttons)
```

### CrisisInterruptOverlay
```
- Triggered when crisis keywords detected in chat input or any text field
- Full-screen overlay (not dismissable by clicking outside)
- Background: dark overlay over everything
- Center card (max 480px wide):
  - Red border
  - Heading: "We noticed something in what you typed."
  - Body: "If you're having thoughts of hurting yourself, help is available right now."
  - Crisis line info (large, tappable): phone, text, chat
  - Dismiss: "I'm okay, continue" (small, below crisis info)
- This overlay fires BEFORE the message is sent to AI
```

### SourceChip
```
- Small pill chip attached to AI response bubbles
- CFR citation or VA.gov reference
- On tap: opens citation detail sheet (title, text excerpt, link to source)
- Visual: icon (book icon) + citation reference text
- Background: --surface-overlay
```

---

## ACCESSIBILITY REQUIREMENTS (WCAG 2.1 AA)

- All text contrast: minimum 4.5:1 (large text: 3:1)
- All interactive elements: visible focus ring (3px, --accent-primary)
- Touch targets: 48x48px minimum, 56x56px preferred
- All images: alt text
- All form inputs: associated `<label>` elements
- All modals: focus trapped, Escape closes, returns focus to trigger
- All custom components: appropriate ARIA roles, states, and properties
- Keyboard navigation: full keyboard-only usability, logical tab order
- Screen reader: test with NVDA (Windows) and VoiceOver (mobile)
- Reduced motion: all animations gated behind `prefers-reduced-motion` check
- Semantic HTML: use correct elements (nav, main, section, article, button — never div-as-button)
- Error messages: never generic — always say what to do next
- Loading states: skeleton screens with aria-busy="true", descriptive text

---

## RESPONSIVE BREAKPOINTS

```
mobile:   < 768px
tablet:   768px – 1024px
desktop:  > 1024px
```

The web app uses a **single-column layout on mobile** and **two-panel layout on desktop** for Document Review and Chat. All other screens are single-column with max-width: 800px centered.

---

## MOTION + ANIMATION GUIDELINES

All animations are disabled when `prefers-reduced-motion: reduce` is set.

Allowed animations (when motion is OK):
- ScoreRing fill: 600ms ease-out on mount only
- Page transitions: 150ms fade only
- Skeleton pulses: gentle opacity oscillation
- Progress bar: smooth linear fill
- Accordion expand/collapse: 200ms ease-in-out

NOT allowed:
- Auto-playing anything
- Parallax
- Looping decorative animations
- Anything faster than 100ms (can trigger seizures)

---

## MICRO-COPY STANDARDS

Tone: Direct, warm, non-patronizing. This is an educated audience that has been through real hardship. Don't use military jargon unless it's being explained.

Error messages must follow: [What happened] + [What to do next]
- Bad: "Upload failed."
- Good: "We couldn't read that file. Try saving it as a PDF and uploading again."

Loading messages must be encouraging, not clinical:
- "Scanning your document for private information... (keeping you safe)"
- "Reading the VA decision letter... this takes about 30 seconds"
- "Finding relevant regulations for your question..."

Empty states must be helpful:
- Empty claims tracker: "No claims tracked yet. Start by [uploading a decision letter or creating a new claim]."

---

## SKILLS TO APPLY BEFORE BUILDING ANY UI

**Full skills registry:** `claude/skills/skills-registry.md` — read that file first.

### Required skill stack for every UI component:

| Skill | Source | Purpose |
|-------|--------|---------|
| `frontend-design` | `C:\ClaudeSkills\skills\frontend-design\` | **Anti-slop enforcement** — demands committed aesthetic direction, bans Inter/Roboto/Arial and purple gradients |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 161 reasoning rules, 67 styles, 57 font pairings, 161 palettes — the design decision database |
| `design-system` | `C:\ClaudeSkills\skills\design-system\` | WCAG contrast math, 60-30-10 color rule, 8px grid, typography scale |

```bash
# Install ui-ux-pro-max if not already installed
npm install -g uipro-cli && uipro init --ai claude --global

# Update cowork-skills (frontend-design, design-system live here)
cd "C:\ClaudeSkills" && git pull && .\setup.ps1
```

### Workflow for every new component — no shortcuts:
1. Read this spec section for the component's layout and behavior
2. Apply `frontend-design` skill: **choose a conceptual direction first**, before any code
3. Apply `ui-ux-pro-max` skill: select matching style, color palette, font pairing
4. Validate contrast ratios with `design-system` skill rules (WCAG AA minimum)
5. Build the component using design tokens from this spec
6. Check `packages/ui-components/src/` — extend existing rather than duplicating
7. Run `verified-build-gate` skill
8. Validate rendered output with `beta-team-ui-tester` skill (Playwright)
9. Mark task complete in `.vetassist-progress.json`

### VetAssist Aesthetic Direction (Non-Negotiable)

VetAssist serves veterans. The design point-of-view is **"Controlled Authority with Human Warmth"** — not clinical, not startup-generic, not bureaucratic.

- **`ui-ux-pro-max` style keywords:** "Editorial/Magazine" for information density, "Utilitarian/Military" for structural chrome, "Refined Minimalism" for content breathing room
- **Typography direction:** Slab serif headings (Zilla Slab, Bitter, Playfair Display) + humanist sans body (Source Sans 3, Open Sans, Lora) — NOT Inter, NOT Space Grotesk
- **The one unforgettable thing:** ScoreRing — must feel precision-engineered, like a calibration instrument, not a generic web chart
- **Motion:** Purposeful only — the ScoreRing fill animation is the only "wow" moment permitted
