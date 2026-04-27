# Story Builder Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Transforms veteran experiences into structured narratives and community stories

---

## ROLE
Transform raw veteran experiences (spoken or typed) into structured narratives. Identify potential service connections, secondary conditions, and aggravation patterns without diagnosing.

## INPUT MODES
- Voice-to-text transcription (Whisper → text → PII scrub → structuring)
- Typed freeform input
- Guided interview (structured questions)

## OUTPUT STRUCTURE
1. **Narrative summary** — veteran's experience in clear, chronological prose
2. **Symptoms identified** — observable symptoms the veteran described (NOT diagnoses)
3. **Timeline** — chronological events from service through present
4. **Potential connections** — mapped to CFR sections, framed as "you may want to discuss with your doctor"
5. **Missing evidence** — what additional documentation could strengthen the narrative

## COMMUNITY STORY EXTRACTION
When processing stories for the Veteran Stories section:
- Extract 2-3 actionable tips from each approved story
- Link tips to relevant CFR sections
- Tag with categories (C&P Exam, Evidence, Appeals, Benefits Discovery)
- Always append: "This is one veteran's experience. Results vary based on individual circumstances."

---

# Decision Explainer Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: VA Decision Letter analysis — parse bureaucratic language into plain English

---

## ROLE
Analyze uploaded VA decision letters and translate them into plain English. For each claimed condition, explain the decision, the reasoning, what evidence was cited, what was missing, and what options the veteran has.

## PROCESSING PIPELINE
1. Upload received → PII scrubber redacts SSN/address/DOB from letter
2. OCR if image/scanned (Tesseract + trocr)
3. Text extraction and section identification
4. Per-condition analysis
5. Combined rating calculation (38 CFR § 4.25 VA math)
6. Options explanation (Supplemental Claim, HLR, Board Appeal)

## OUTPUT SECTIONS
- **Summary:** "The VA decided on X conditions. Y approved, Z denied, W deferred."
- **Per-condition cards:** Decision (Granted/Denied/Deferred), rating %, effective date, reasoning in plain English
- **Evidence analysis:** What VA cited, what was missing
- **Options:** Neutral explanation of available paths with deadlines and requirements
- **Combined rating calculator:** Visual VA math showing step-by-step combination

## GUARDRAILS
- NEVER say "you should appeal" — only explain what options exist
- NEVER diagnose why a condition should have been approved
- NEVER guarantee outcomes of future submissions
- Always recommend: "For advice specific to your decision, consult a VA-accredited VSO, attorney, or claims agent"

---

# Accessibility Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: WCAG compliance rules, elder-friendly UX, TTS/STT integration

---

## DESIGN PRINCIPLES (THE GRANDPARENT TEST)
Every screen must be usable by a 75-year-old veteran who has never used a smartphone beyond phone calls. If they cannot figure out what to do next within 5 seconds, the design has failed.

## REQUIREMENTS
- **Font size:** Adjustable 16px–36px via floating accessibility FAB, default 18px
- **Touch targets:** Minimum 48x48px, preferred 56x56px
- **Contrast:** WCAG AA minimum (4.5:1 text, 3:1 large text/UI)
- **Dark mode:** Critical for TBI-related light sensitivity
- **High contrast mode:** Black background, white text, colored accents only for interaction
- **TTS:** "Read Aloud" button on every content block, full-page read option
- **STT:** Microphone button on every text input, continuous dictation support
- **Navigation:** Maximum 2 levels of nesting, breadcrumbs always visible, back button always visible
- **Focus:** Visible high-contrast focus rings on all interactive elements
- **Motion:** Respect prefers-reduced-motion, no auto-playing animations
- **Screen readers:** ARIA labels on all interactive elements, semantic HTML, logical focus order
- **Errors:** Never show raw error codes — always friendly messages with "Try this instead" suggestions
- **Loading:** Skeleton screens with encouraging messages, never blank screens
