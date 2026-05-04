# Product

## Register

product

## Users

Veterans navigating the VA benefits system — ranging from newly separated service members who don't know what they're entitled to, to Vietnam-era veterans who've been fighting the system for decades. Many are dealing with PTSD, TBI, chronic pain, or bureaucratic fatigue. They may be 25 or 75. Some are highly technical; many are not. They arrive frustrated, often after being turned away or overwhelmed by VA.gov. They are not patients — they are people who earned something and are trying to claim it.

Secondary users: VSO (Veteran Service Organization) representatives helping veterans navigate paperwork on their behalf.

The primary job to be done: understand what benefits exist, what the VA decided and why, whether a document is strong enough to support a claim, and what to do next — without needing a lawyer.

## Product Purpose

VetAssist is an educational and empowerment platform — not a law firm, claims filer, or outcome guarantor. It helps veterans understand the VA system through an AI chat assistant, document quality scoring, benefits discovery, claims tracking, community stories, and decision letter analysis. Everything is free, always.

Legal position: educational platform under VA OGC 2004 Opinion. The platform informs; it does not act on a veteran's behalf.

Success looks like: a veteran who arrived confused about a denial letter leaves understanding exactly what was decided, why, what evidence was missing, and what their appeal options are — without having to decode bureaucratic language alone.

## Brand Personality

Controlled authority with human warmth. Not clinical. Not startup-generic. Not bureaucratic.

Three words: **Trustworthy. Clear. Steady.**

The emotional goal: a veteran should feel like they finally have someone in their corner who knows the system — like a knowledgeable buddy who's been through the process and will give it to them straight, not talk down to them, and never waste their time.

Tone: direct, warm, non-patronizing. This is an educated audience that has been through real hardship. The voice earns respect by being useful, not by performing empathy.

## Anti-references

- **VA.gov itself** — bureaucratic information architecture, institutional blue, dense government prose, visual language that signals "official system" rather than "ally."
- **Healthcare.gov / clinical health portals** — sterile white + teal, form-over-form UI, the feeling of a medical intake process.
- **BetterHelp / mental health SaaS** — corporate warmth, performative pastel softness, the design language of therapy-as-subscription.
- **Generic dark-mode SaaS dashboards** — Vercel/Linear clones with Inter, purple-to-blue gradients, hero metrics, identical card grids. Looks like every other dev tool.
- **Military recruiting aesthetics** — eagles, camouflage, aggressive red-white-blue. Veterans don't need to be reminded they served; they need help now.

## Design Principles

1. **The Grandparent Test first.** Every screen must be immediately navigable by a 75-year-old veteran who has never used a smartphone for more than calls. If the path to the next action isn't obvious in five seconds, redesign before reaching for visual polish.

2. **Calm is a feature.** Veterans with TBI can experience sensory overload. Low stimulation is not a design constraint — it is a form of respect. Every animation, color choice, and density decision runs through this filter.

3. **Clarity over cleverness.** Plain language, direct labels, error messages that say what to do next. The UI earns trust by being exactly what it says it is, not by surprising the user.

4. **Precision signals care.** The ScoreRing, the CFR citation chips, the structured decision letter breakdown — these details communicate that the platform takes the veteran's situation seriously. Craft is not decoration here; it is credibility.

5. **Safety is structural, not decorative.** The crisis banner, PII warnings, compliance gate, and AI disclosure are non-negotiable — but they must be designed with the same care as every other element. A crisis banner that looks like a cookie consent bar has failed.

## Accessibility & Inclusion

WCAG 2.1 AA minimum across all surfaces. WCAG AAA targets for text contrast and touch targets where achievable.

Known user needs:
- TBI: reduce motion by default option, low-stimulation color palette, avoid rapid transitions
- Low vision: font size adjustable 16–36px via persistent Accessibility FAB, high contrast mode toggle
- Motor impairment: 48x48px minimum touch targets (56x56px preferred), full keyboard navigation
- Screen reader: test with NVDA (Windows) and VoiceOver (iOS/macOS)
- Cognitive load: one primary action per screen, no time-pressure interactions, error messages that redirect rather than blame

Reduced motion: all animations gated behind `prefers-reduced-motion: reduce`. ScoreRing fill animation is the only "wow" moment — skip it entirely under reduced motion.
