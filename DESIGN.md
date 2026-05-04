---
name: VetAssist
description: AI Battle Buddy for VA Benefits — educational platform for veterans.
colors:
  field-black: "#0D0F14"
  aged-canvas: "#1C2033"
  old-glory-red: "#B22234"
  text-primary: "#EDF0F4"
  text-secondary: "#8A96AA"
  star-white: "#F5F5F5"
  field-blue: "#1A2744"
  stripe-red-muted: "#7A1A1A"
  military-olive: "#4A5240"
  border: "#2A3149"
  surface-hover: "#222640"
  crisis-bg: "#8B0000"
  score-low: "#B22234"
  score-mid: "#C8A135"
  score-high: "#4A7C59"
typography:
  display:
    fontFamily: "Oswald, Georgia, serif"
    fontSize: "3.17rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Oswald, Georgia, serif"
    fontSize: "2.33rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
  title:
    fontFamily: "Oswald, Georgia, serif"
    fontSize: "1.78rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Oswald, Georgia, serif"
    fontSize: "0.61rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: "4px"
  button: "4px"
  input: "4px"
  badge: "2px"
  pill: "100px"
spacing:
  "1": "8px"
  "2": "16px"
  "3": "24px"
  "4": "32px"
  "5": "40px"
  "6": "48px"
  "8": "64px"
  "10": "80px"
components:
  button-primary:
    backgroundColor: "{colors.old-glory-red}"
    textColor: "{colors.star-white}"
    rounded: "{rounded.button}"
    padding: "0 24px"
    height: "48px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.stripe-red-muted}"
    textColor: "{colors.star-white}"
    rounded: "{rounded.button}"
    padding: "0 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.button}"
    padding: "0 24px"
  nav-item-default:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "0px"
    padding: "12px 16px"
    typography: "{typography.label}"
  nav-item-active:
    backgroundColor: "{colors.aged-canvas}"
    textColor: "{colors.text-primary}"
    rounded: "0px"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.aged-canvas}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.field-black}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  chip-filter:
    backgroundColor: "{colors.aged-canvas}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-filter-active:
    backgroundColor: "{colors.old-glory-red}"
    textColor: "{colors.star-white}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
---

# Design System: VetAssist

## 1. Overview

**Creative North Star: "The Worn Flag"**

This system is built around a single physical object: a flag that has been carried, folded, and unfolded many times. Not the recruiting poster flag — the field flag. Its colors are deep and muted, its fabric has weight, its stars are earned. That object is the emotional register for every design decision: authority without aggression, dignity without bureaucracy, service without performance.

The palette is called Stars & Field. Field Black (`#0D0F14`) covers 60% of every surface — a near-black with enough blue cast to read as intentional, not default. Aged Canvas (`#1C2033`) raises cards and panels off the base at 30%. Old Glory Red (`#B22234`) appears on no more than 10% of any screen — CTAs, active navigation states, the crisis banner. Its rarity is structural. Typography pairs Oswald (a compressed, military-stencil condensed sans) with Source Serif 4 (a reading-optimized serif with warmth) — command voice and human voice in balance.

This system explicitly rejects: VA.gov's institutional blue and government-portal visual language; clinical white-and-teal health portal aesthetics; BetterHelp's performative corporate warmth; generic dark-mode SaaS (Inter, purple-to-blue gradients, identical card grids); and military recruiting aesthetics (eagles, camo, aggressive patriotic maximalism). The design serves veterans who are past the recruiting stage — they need a tool that respects their intelligence and doesn't waste their time.

**Key Characteristics:**
- Dark mode primary, always — low-stimulation by design, not by trend
- Compressed condensed type (Oswald) for structural chrome; warm serif (Source Serif 4) for all reading content
- Sharp corners throughout (4px radius) — precision over softness
- Single accent color (Old Glory Red) used with discipline — maximum 10% surface coverage
- Flag watermark at 3% opacity in the sidebar — felt, not seen
- Every interactive element meets 48px touch target minimum

## 2. Colors: The Stars & Field Palette

A restrained three-tier system: one dominant surface color, one raised-surface color, one accent. Everything else is text hierarchy and semantic status.

### Primary
- **Old Glory Red** (`#B22234`): The sole action color. Primary buttons, active navigation left-border, drag-active state highlight, notification badges. Never used decoratively.
- **Crisis Crimson** (`#8B0000`): Reserved exclusively for the Veterans Crisis Line banner background. Darker and more urgent than Old Glory Red. Never used elsewhere — its singularity is the warning.

### Secondary
- **Field Blue** (`#1A2744`): Background for the AI Disclosure Banner. Structural, not decorative — distinguishes AI-adjacent surfaces from neutral ones.
- **Military Olive** (`#4A5240`): The AI disclosure left-border, the collapsed disclosure indicator. Signals "information present" without alarm.

### Tertiary
- **Score Gold** (`#C8A135`): Mid-range document score indicator (40–69%). Amber warning register, muted to avoid garish.
- **Score Green** (`#4A7C59`): High document score (70–100%). Deliberately desaturated — earned confidence, not celebration.

### Neutral
- **Field Black** (`#0D0F14`): The dominant 60% surface. All page backgrounds, drop zone backgrounds, input backgrounds.
- **Aged Canvas** (`#1C2033`): The 30% raised surface. All cards, panels, sidebar background, thumbnail boxes.
- **Border** (`#2A3149`): All dividers, input strokes, drop zone dashed border, score ring track.
- **Surface Hover** (`#222640`): Hover state for interactive surfaces.
- **Star White** (`#F5F5F5`): Highest-contrast text. Score ring percentage readout, logo, crisis text.
- **Text Primary** (`#EDF0F4`): All body content text.
- **Text Secondary** (`#8A96AA`): Captions, subtitles, section labels, placeholder text, disclosure text.
- **Stripe Red Muted** (`#7A1A1A`): Button hover state for Old Glory Red — darkened, not lightened.

**The Scarcity Rule.** Old Glory Red appears on ≤10% of any screen. Its rarity makes it visible. If a screen has more than one red element competing for attention, one of them is wrong.

**The Crisis Isolation Rule.** Crisis Crimson (`#8B0000`) belongs to the crisis banner and nothing else. No other component, state, or decoration may use it. If a designer reaches for dark red outside the banner, they are about to violate this rule.

## 3. Typography

**Display / Heading Font:** Oswald (Google Fonts, weights 500/600/700), fallback Georgia, serif
**Body Font:** Source Serif 4 (Google Fonts, weights 400/500/600), fallback Georgia, serif
**Mono Font:** JetBrains Mono (Google Fonts, weights 400/500), fallback monospace

**Character:** Oswald is a redrawn condensed gothic — military stencil energy, efficient, authoritative without shouting. Source Serif 4 is a reading-optimized humanist serif with warmth in its curves — the voice that explains, not commands. Together they split the interface cleanly: structure speaks in Oswald, content speaks in Source Serif 4.

### Hierarchy
- **Display** (Oswald 700, 3.17rem / ~57px, line-height 1.1, tracking 0.04em): Page-level heroes only. Rare.
- **Headline / H1** (Oswald 600, 2.33rem / ~42px, line-height 1.2, tracking 0.04em): Primary screen titles.
- **Title / H2** (Oswald 500, 1.78rem / ~32px, line-height 1.3, tracking 0.04em): Section headers, card titles.
- **H3** (Oswald 500, 1.33rem / ~24px, line-height 1.4): Sub-section headers.
- **Body** (Source Serif 4 400, 1rem / 18px, line-height 1.6): All reading content. Maximum line length 65–75ch.
- **Small** (Source Serif 4 400, 0.78rem / ~14px, line-height 1.5): Secondary copy, disclosure text, captions.
- **Label** (Oswald 600, 0.61rem / ~11px, tracking 0.1em, uppercase): Navigation items, section dividers, button text, badge text. Always uppercase.
- **Caption** (Oswald 600, 0.67rem / ~12px): Fine print, timestamp text.
- **Mono** (JetBrains Mono 400/500, 0.875rem): Certificate IDs, VA file numbers, form field values with structured data.

**The Two-Voice Rule.** Oswald owns all structural chrome: navigation, buttons, labels, section headers, the logo. Source Serif 4 owns all reading content: body paragraphs, disclosure text, explanations, community stories. Never swap them. A serif button or an Oswald paragraph is a violation, not a variant.

**The Never-Inter Rule.** Inter, Roboto, and Arial are prohibited on all surfaces. They carry no character and signal generic SaaS. This is not a preference — it is enforced at the token level.

## 4. Elevation

This system uses **tonal layering, not shadows**. Depth is conveyed by surface color steps: Field Black (base) → Aged Canvas (raised) → Surface Hover (interactive lift). Shadows are used only for modals and overlays where physical separation from page content must be unambiguous.

### Shadow Vocabulary
- **Modal / Overlay** (`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7)`): Full-screen modals, crisis interrupt overlay, PIIWarningModal. Signals complete separation from page content.
- **Focus Ring** (`box-shadow: 0 0 0 3px #B22234`): All keyboard-focused interactive elements. Old Glory Red, 3px offset, no blur — crisp and immediately visible.

**The Flat-By-Default Rule.** Cards, panels, inputs, and navigation are flat at rest. No ambient shadow, no card lift, no hover glow. The only motion on hover is a background-color shift to Surface Hover (`#222640`). Shadows are reserved for elements that physically interrupt page flow (modals, tooltips, overlays).

**The Focus Ring Rule.** Every interactive element — buttons, inputs, nav items, drop zones, chips — shows a 3px Old Glory Red focus ring on keyboard focus. Never hidden, never styled to match the surface. WCAG 2.1 AA requires it; this system makes it a design feature.

## 5. Components

### Buttons
Buttons in this system have a single primary variant and two utility variants. Sharp corners (4px radius) throughout — no pill buttons for primary actions.

- **Shape:** 4px radius, 48px height (touch target minimum), uppercase Oswald label at 0.61rem / tracking 0.04em
- **Primary** (Old Glory Red `#B22234` background, Star White text, 0 24px padding): The sole high-emphasis action. Used once per screen section maximum.
- **Primary Hover:** Background shifts to Stripe Red Muted (`#7A1A1A`) — darkens, never lightens. 150ms transition.
- **Ghost / Dismiss:** Transparent background, Text Secondary color. Used for secondary actions (dismiss, cancel, "Got it"). Same dimensions as primary.
- **Disabled:** 40% opacity, no pointer events. No special disabled color — just reduced presence.

**The One Red Button Rule.** Each distinct action area has at most one Primary button. If two actions compete, one is demoted to Ghost. Never two red buttons side by side.

### Chips / Filter Pills
- **Default:** Aged Canvas background, Text Secondary color, 100px radius (pill), 6px 14px padding, Oswald label
- **Active / Selected:** Old Glory Red background, Star White text — same shape
- **Use case:** Benefit category filters, story category filters, document type selectors. Not for navigation.

### Cards / Containers
Cards in this system are structural containers, not decorative frames.

- **Corner Style:** 4px radius — sharp, precise
- **Background:** Aged Canvas (`#1C2033`) — one step above Field Black
- **Shadow Strategy:** None at rest. See Elevation section.
- **Border:** None by default. Border (`#2A3149`) used only when a card needs explicit visual separation from an adjacent same-color surface.
- **Internal Padding:** 24px (`--va-space-3`) standard; 16px for compact list items.
- **The No-Nesting Rule.** Cards never contain cards. If a sub-section within a card needs visual grouping, use a background tint or a horizontal rule — never a nested card.

### Inputs / Fields
- **Style:** Field Black background, Border stroke (1px, `#2A3149`), 4px radius, 12px 16px internal padding
- **Typography:** Source Serif 4 for user-typed content; Oswald for labels above the field
- **Focus:** Border shifts to Old Glory Red + 3px focus ring. No glow, no shadow — just crisp color change.
- **Error:** Border shifts to Score Low red (`#B22234`) + inline error text in Source Serif 4 italic below the field. Error text states what happened and what to do next.
- **Disabled:** 40% opacity, not-allowed cursor.
- **PII Scanning State:** Subtle pulsing border (opacity oscillation 0.6→1.0, 2s cycle) while PII scan is running. Communicates active protection without interrupting input.

### Navigation
The sidebar is the primary navigation surface. Field Black background, 240px wide, sticky below the 48px crisis banner.

- **Section labels:** Oswald 600, 0.56rem, tracking 0.1em, uppercase, Text Secondary color (`#8A96AA`). Pure wayfinding — not interactive.
- **Nav items:** Oswald 500, Small size, tracking 0.04em, uppercase. Default: Text Secondary, transparent background, transparent left border (3px, placeholder width). 48px min-height touch target.
- **Active state:** Text Primary color, Aged Canvas background, Old Glory Red left border (3px). The red border is the only active indicator — no icon swap, no bold weight change.
- **Hover state:** Surface Hover background (`#222640`), Text Primary color. 150ms transition.
- **Badges:** Old Glory Red background, Star White text, Oswald 600 0.56rem, 2px radius. Right-aligned within the nav item.
- **Mobile (<768px):** Collapses to bottom tab bar (5 tabs). Crisis banner remains at top.
- **Flag watermark:** American flag SVG at 3% opacity, bottom of sidebar, pointer-events none. Atmospheric, not decorative.

### ScoreRing (Signature Component)
The ScoreRing is the most distinctive element in the system. It must read as a precision instrument — a calibration gauge — not a donut chart.

- **Dimensions:** 140px diameter (172px SVG viewport with 16px padding for tick marks), 12px stroke width
- **Track:** Border color (`#2A3149`) — the empty portion of the ring
- **Score arc:** Single solid color based on score tier:
  - 0–39%: Score Low (`#B22234`, Old Glory Red register — the document needs work)
  - 40–69%: Score Gold (`#C8A135` — review advised)
  - 70–100%: Score Green (`#4A7C59` — mission-ready)
- **Tick marks:** 24 equally spaced 1px lines at 20% opacity in Text Secondary — the gauge calibration marks
- **Center text:** Score percentage in Oswald 700 at 2rem, Star White; category label in Source Serif 4 at 0.67rem, Text Secondary
- **Animation:** stroke-dashoffset animates from 0 to target value over 800ms using `--va-ease-out`. Disabled entirely under `prefers-reduced-motion`. This is the only "wow" moment in the system — it must be earned.
- **ARIA:** `role="img"` with `aria-label="Document quality score: [N]% — [category]"`. All visual elements are `aria-hidden`.

### CrisisLineBanner (Safety Component)
Not a notification. Not a banner that can be dismissed. A permanent fixture.

- **Position:** Sticky top, z-index 1000 (highest in system), height 48px
- **Background:** Crisis Crimson (`#8B0000`) — isolated color, used nowhere else
- **Text:** Oswald 600, 0.61rem, tracking 0.06em, uppercase, Star White
- **Animation:** Slow opacity pulse (3s ease-in-out, 1.0→0.88) under `prefers-reduced-motion: no-preference` only
- **Interaction:** Entire banner is a single `<a href="tel:988">` link. No close button, no dismiss mechanism, no visibility toggle.

### DocumentDropZone (Upload Component)
Mission-briefing document aesthetic — the visual language of a classified document folder, not a file picker.

- **Default:** 2px dashed Border (`#2A3149`) border, Field Black background, 40px 32px padding. Dashed border signals "expected input here."
- **Drag active:** Border shifts to Old Glory Red; background tints 15% toward Old Glory Red via `color-mix`.
- **Drop icon:** 📋 emoji at 40px with a 16px ★ star watermark at 25% opacity top-right — the same star motif carried from the nav
- **Heading:** Oswald 600, uppercase ("DROP YOUR DOCUMENTS HERE")
- **Thumbnail tray:** Horizontal scroll row below the zone, 80px square thumbnails, Border stroke, Aged Canvas background

## 6. Do's and Don'ts

### Do:
- **Do** keep Old Glory Red (`#B22234`) to ≤10% surface coverage on any screen. One primary action, one active state, one badge per view — not all three simultaneously.
- **Do** use Oswald for all structural chrome (buttons, labels, nav, section headers) and Source Serif 4 for all reading content (body, captions, explanations). The two-voice split is non-negotiable.
- **Do** set all touch targets to a minimum of 48×48px. Veterans with motor impairment use this platform. 56×56px for FABs and primary CTAs.
- **Do** gate every animation behind `prefers-reduced-motion: reduce`. The CSS token `--va-duration-slow` resolves to `0ms` automatically when the OS setting is active — use the token, never hardcode durations.
- **Do** use 4px radius on all interactive components (buttons, inputs, cards, badges). Sharpness reads as precision. Rounding reads as consumer-app softness — wrong register.
- **Do** write error messages as: [What happened] + [What to do next]. Never a single word or a technical error code.
- **Do** make loading states encouraging: "Reading your decision letter... this takes about 30 seconds." Never clinical progress percentages without context.
- **Do** use JetBrains Mono for any structured data: VA file numbers, certificate IDs, claim reference numbers, form field values that are identifiers.

### Don't:
- **Don't** use Inter, Roboto, or Arial anywhere. These fonts are banned at the token level. They carry no character and signal the exact generic SaaS aesthetic this system rejects.
- **Don't** use VA.gov blue (`#003E73` or similar) on any surface. VetAssist is not a government portal. Using institutional blue implies official affiliation it does not have — a legal and brand risk.
- **Don't** replicate Healthcare.gov or clinical health portal aesthetics: white or teal backgrounds, form-over-form layouts, the visual language of a medical intake process.
- **Don't** replicate BetterHelp or mental health SaaS aesthetics: pastel softness, performative warmth, therapy-as-subscription design language.
- **Don't** use purple-to-blue gradients, glassmorphism, hero metrics (big number + small label + gradient accent), or identical card grids. These are the markers of generic dark-mode SaaS — the exact anti-reference.
- **Don't** use military recruiting aesthetics: eagles, camouflage patterns, aggressive red-white-blue patriotic maximalism. Veterans are past the recruiting stage. They need a tool, not a recruiting poster.
- **Don't** use `border-left` greater than 3px as a decorative stripe on cards or list items. The 3px left border on active nav items is a precise active indicator — not a pattern to extend elsewhere.
- **Don't** nest cards. A card inside a card is always wrong. Use a background tint or a rule to create sub-grouping within a card.
- **Don't** use `color-mix`, HSL, or any format other than hex for token values. The token system uses hex exclusively; OKLCH belongs in design tooling, not in the CSS token file.
- **Don't** use Crisis Crimson (`#8B0000`) for anything except the CrisisLineBanner. Not for error states, not for alerts, not for emphasis. Its isolation is the warning signal.
- **Don't** make any animation faster than 100ms. Rapid transitions can trigger photosensitive responses. The minimum safe duration is 150ms (`--va-duration-fast`).
- **Don't** dismiss or hide the CrisisLineBanner under any condition — not during onboarding, not on marketing pages, not in maintenance mode. It is the one element that is always visible.
