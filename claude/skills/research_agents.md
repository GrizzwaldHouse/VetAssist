# Multi-Agent Research System Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Sub-agent architecture for federal, state, and VA knowledge research with anti-bloat filtering

---

## SKILL SYSTEM ARCHITECTURE

Every skill follows this format (inspired by awesome-claude-skills, Anthropic knowledge-work-plugins, and Claude Cowork):

```
/claude/skills/
  /skill-name/
    SKILL.md          # Instructions (what the skill does, when it activates, how it behaves)
    config.json        # Configuration (parameters, thresholds, sources, toggles)
    /scripts/          # Optional automation scripts
```

Skills are:
- **Auto-discovered**: Claude Code scans /claude/skills/ on startup
- **Dynamically loaded**: Only the relevant skill is read for the current task (lean-ctx pattern)
- **Composable**: Multiple skills can activate for a single request
- **Token-efficient**: Progressive loading — read SKILL.md first, load config.json only if needed

### Skills to Install from External Repos

```bash
# Anthropic official (MANDATORY)
claude plugin add anthropic/frontend-design      # Anti-generic UI
claude plugin add anthropic/knowledge-work-plugins  # Knowledge worker patterns

# Community (RECOMMENDED)
# From alirezarezvani/claude-skills (232+ skills)
# Install: compliance, accessibility, UI design skills
# From obra/superpowers (20+ battle-tested skills)
claude plugin add obra/superpowers

# Marcus's own skills repo
# Clone and symlink relevant skills
git clone https://github.com/GrizzwaldHouse/cowork-skills.git
ln -s cowork-skills/relevant-skill ~/.claude/skills/

# Token optimization (REQUIRED for multi-agent workflows)
cargo install lean-ctx
lean-ctx init --global
claude mcp add lean-ctx lean-ctx
```

---

## MULTI-AGENT RESEARCH SYSTEM

### Architecture Overview

```
RESEARCH_ORCHESTRATOR
  │
  ├─→ FEDERAL_AGENT
  │     ├─ 38 U.S.C. (statutory authority)
  │     ├─ 38 CFR Parts 3, 4, 14 (regulations)
  │     ├─ Federal Register (proposed/final rules)
  │     └─ PACT Act presumptive conditions
  │
  ├─→ STATE_AGENT_ROUTER → STATE_AGENT[state]
  │     ├─ State veteran benefit laws
  │     ├─ State charging/fee prohibitions
  │     ├─ State-specific benefits (tax exemptions, education, etc.)
  │     └─ State consumer protection laws affecting veterans
  │
  ├─→ VA_KNOWLEDGE_AGENT
  │     ├─ VA M21-1 Manual (rater procedures)
  │     ├─ VA.gov benefits pages
  │     ├─ DBQ forms (C&P exam evaluation criteria)
  │     ├─ VA rating schedule (38 CFR Part 4)
  │     └─ BVA decisions (appeal outcomes)
  │
  ├─→ TOXIC_EXPOSURE_AGENT (PACT Act specialist)
  │     ├─ Burn pit presumptive conditions (23+ categories, 330+ conditions)
  │     ├─ Agent Orange presumptive conditions
  │     ├─ Camp Lejeune water contamination
  │     ├─ Radiation exposure
  │     ├─ Gulf War illness
  │     └─ Tobacco/substance exposure during service
  │
  └─→ COMMUNITY_INTELLIGENCE_AGENT
        ├─ Anonymized testimonial patterns
        ├─ Role → condition frequency mapping
        └─ Strategy extraction from veteran stories
```

### Agent Interface (TypeScript)

```typescript
interface ResearchAgent {
  id: string;
  name: string;
  sources: DataSource[];
  schedule: CronExpression;
  
  fetch(): Promise<RawData[]>;
  normalize(raw: RawData[]): Promise<NormalizedData[]>;
  deduplicate(data: NormalizedData[]): Promise<NormalizedData[]>;
  scoreRelevance(data: NormalizedData[]): Promise<ScoredData[]>;
  filter(data: ScoredData[], threshold: number): Promise<RelevantData[]>;
  summarize(data: RelevantData[]): Promise<KnowledgeChunk[]>;
  archive(outdated: KnowledgeChunk[]): Promise<ArchiveRecord[]>;
}

interface DataSource {
  name: string;
  url: string;
  type: "api" | "scraper" | "manual";
  reliability: "official" | "verified" | "community" | "unverified";
  updateFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  legalStatus: "public_domain" | "government_work" | "fair_use" | "requires_permission";
}

interface KnowledgeChunk {
  id: string;
  source: string;
  sourceReliability: "official" | "verified" | "community";
  content: string;
  tags: string[];
  relevanceScore: number;      // 0.0 - 1.0
  version: string;
  fetchedAt: Date;
  expiresAt: Date;             // When to re-check this content
  citationRef: string;         // e.g., "38 CFR § 3.310(a)"
  supersededBy?: string;       // ID of newer version if archived
}
```

---

## FEDERAL COMPLIANCE AGENT

### config.json
```json
{
  "agent_id": "federal_compliance",
  "sources": [
    {
      "name": "eCFR Title 38",
      "url": "https://www.ecfr.gov/api/versioner/v1/full/current/title-38.xml",
      "type": "api",
      "reliability": "official",
      "updateFrequency": "daily",
      "legalStatus": "government_work",
      "priority_sections": ["part-3", "part-4", "part-14"]
    },
    {
      "name": "Federal Register VA",
      "url": "https://www.federalregister.gov/api/v1/documents?conditions[agencies][]=veterans-affairs-department",
      "type": "api",
      "reliability": "official",
      "updateFrequency": "daily",
      "legalStatus": "government_work"
    },
    {
      "name": "38 USC via USCODE.house.gov",
      "url": "https://uscode.house.gov/download/title38.shtml",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "quarterly",
      "legalStatus": "government_work"
    }
  ],
  "relevance_threshold": 0.5,
  "max_chunks_per_run": 500,
  "archive_after_days": 730,
  "schedule": "0 6 * * *"
}
```

### Key Monitoring Targets
- 38 CFR § 3.304 (service connection for PTSD)
- 38 CFR § 3.310 (secondary service connection)
- 38 CFR § 3.317 (Gulf War undiagnosed illness — EXPIRES DEC 31, 2026)
- 38 CFR § 4.71a (musculoskeletal rating schedule)
- 38 CFR § 4.124a (neurological rating schedule)
- 38 CFR § 4.130 (mental health rating schedule)
- 38 CFR § 14.636 (fee regulations — critical for monetization compliance)
- 38 U.S.C. § 5904 (agent/attorney recognition and fee rules)

---

## STATE COMPLIANCE AGENT

### Architecture
One logical agent that routes to state-specific rule sets. NOT 50 separate running agents (that would be wasteful). Instead: one agent with a state parameter.

### config.json
```json
{
  "agent_id": "state_compliance",
  "routing": "state_parameter",
  "sources": [
    {
      "name": "State Legislature Tracking",
      "url": "https://api.legiscan.com/",
      "type": "api",
      "reliability": "official",
      "updateFrequency": "weekly",
      "legalStatus": "public_domain",
      "api_key_env": "LEGISCAN_API_KEY"
    },
    {
      "name": "State Veteran Affairs Offices",
      "type": "manual",
      "reliability": "official",
      "updateFrequency": "monthly",
      "legalStatus": "government_work"
    }
  ],
  "priority_states": ["CA", "TX", "FL", "NY", "VA", "NC", "GA", "WA", "CO", "OH"],
  "tracking_topics": [
    "veteran claims consulting fees",
    "veteran benefit protections",
    "state veteran tax exemptions",
    "state veteran education benefits",
    "state veteran property tax",
    "veteran employment preferences"
  ],
  "known_bans": {
    "CA": {"law": "SB 694", "effective": "2026-02-10", "status": "enacted"},
    "ME": {"law": "2024 Session", "effective": "2024", "status": "enacted"},
    "NJ": {"law": "2024 Session", "effective": "2024", "status": "enacted, challenged in court"},
    "NY": {"law": "2024 Session", "effective": "2024", "status": "enacted"},
    "LA": {"law": "PLUS Act", "effective": "2024", "status": "enacted, partially blocked by federal court"}
  },
  "schedule": "0 8 * * 1"
}
```

---

## TOXIC EXPOSURE AGENT (PACT Act Specialist)

### Why This Is a Separate Agent
The PACT Act is the largest expansion of veteran benefits in decades. It covers 23+ categories and 330+ specific conditions. It has its own presumptive framework, its own filing procedures, and its own deadlines. Veterans who served post-9/11 need this information surfaced prominently.

### Critical Deadline: December 31, 2026
Gulf War presumptive conditions for undiagnosed illnesses (38 CFR § 3.317) expire December 31, 2026. Veterans must file before this date. VetAssist MUST surface this deadline prominently.

### config.json
```json
{
  "agent_id": "toxic_exposure",
  "sources": [
    {
      "name": "VA PACT Act Page",
      "url": "https://www.va.gov/resources/the-pact-act-and-your-va-benefits/",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "monthly"
    },
    {
      "name": "VA Public Health Exposures",
      "url": "https://www.publichealth.va.gov/exposures/",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "monthly"
    }
  ],
  "exposure_categories": [
    "burn_pits",
    "agent_orange",
    "camp_lejeune_water",
    "radiation",
    "gulf_war_illness",
    "tobacco_use_during_service",
    "contaminated_water_other",
    "mustard_gas",
    "project_shad",
    "depleted_uranium"
  ],
  "presumptive_conditions_count": "330+",
  "critical_deadlines": [
    {
      "description": "Gulf War undiagnosed illness presumptive deadline",
      "cfr": "38 CFR § 3.317",
      "deadline": "2026-12-31",
      "urgency": "CRITICAL",
      "action": "Surface to all Gulf War era veterans, show countdown"
    }
  ],
  "tobacco_rules": {
    "note": "Under 38 U.S.C. § 1103, VA cannot grant service connection for disability on the basis that it resulted from tobacco use during service for claims filed after June 9, 1998. However, if a veteran can show tobacco use began or was aggravated during service AND caused a secondary condition, there may be paths. Additionally, nicotine dependence acquired during service may be claimable as a condition itself under certain circumstances. This is complex and veterans should consult a VSO.",
    "cfr_reference": "38 U.S.C. § 1103, 38 CFR § 3.300",
    "ai_framing": "Educational only — explain the law, do not advise on individual claims"
  },
  "schedule": "0 9 1 * *"
}
```

---

## VA KNOWLEDGE AGENT

### config.json
```json
{
  "agent_id": "va_knowledge",
  "sources": [
    {
      "name": "VA M21-1 Manual",
      "url": "https://www.knowva.ebenefits.va.gov/system/templates/selfservice/va_ssnew/help/customer/locale/en-US/portal/554400000001018",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "monthly",
      "priority": 1.0
    },
    {
      "name": "VA Rating Schedule (38 CFR Part 4)",
      "url": "https://www.ecfr.gov/current/title-38/chapter-I/part-4",
      "type": "api",
      "reliability": "official",
      "updateFrequency": "monthly",
      "priority": 0.9
    },
    {
      "name": "Disability Benefits Questionnaires",
      "url": "https://www.benefits.va.gov/compensation/dbq_disabilityexams.asp",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "quarterly",
      "priority": 0.8
    },
    {
      "name": "VA.gov Benefits",
      "url": "https://www.va.gov/sitemap.xml",
      "type": "scraper",
      "reliability": "official",
      "updateFrequency": "weekly",
      "priority": 0.5
    }
  ],
  "schedule": "0 7 * * *"
}
```

---

## KNOWLEDGE PIPELINE (Anti-Bloat System)

### Pipeline Events
```
SCRAPER_TRIGGERED
  → DATA_FETCHED (source, raw_size, timestamp)
    → DATA_NORMALIZED (format standardized, metadata extracted)
      → DUPLICATE_DETECTED → skip (or update if newer version)
      → RELEVANCE_SCORED (score 0-1)
        → score >= 0.7 → KNOWLEDGE_INDEXED (added to active RAG)
        → score 0.3-0.7 → KNOWLEDGE_FLAGGED (admin review queue)
        → score < 0.3 → KNOWLEDGE_ARCHIVED (stored but not in active retrieval)
          → ADMIN_NOTIFIED (summary of all changes)
```

### Anti-Bloat Rules
1. Active knowledge base capped at 50K chunks
2. Staleness score: documents unused in retrieval for 90+ days get flagged
3. Quarterly pruning: admin reviews lowest-relevance, lowest-usage chunks
4. Deduplication: content hash comparison prevents storing same info from multiple sources
5. Chunk size standard: 500-1500 tokens per chunk (optimal for RAG retrieval)
6. Version chain: when content updates, old version archived with pointer to new version

### Relevance Scoring Algorithm
```
relevance = (
  regulatory_weight * 0.35 +    // CFR/USC > M21-1 > VA.gov > community
  recency_weight * 0.25 +       // Newer = higher score
  citation_frequency * 0.20 +   // How often this chunk is retrieved in AI responses
  cross_source_validation * 0.20 // Same info confirmed by multiple sources
)
```

---

## MONETIZATION COMPLIANCE GUARD

### Purpose
Before ANY paid feature can be enabled (if the paywall toggle is ever turned on), this guard validates that the feature is legal in the veteran's state and under federal law.

### Check Sequence
```
FEATURE_ACTIVATION_REQUESTED
  │
  ├─→ Is this "preparation, presentation, or prosecution" of a claim?
  │     YES → BLOCK. This cannot be charged for under 38 U.S.C. § 5904.
  │     NO → continue
  │
  ├─→ Is the user in a state that bans veteran claims consulting fees?
  │     Check state_compliance_agent.known_bans[user.state]
  │     YES → BLOCK for any claims-adjacent feature
  │     NO → continue
  │
  ├─→ Is this "educational content" or "informational tools"?
  │     YES → ALLOWED under VA OGC 2004 opinion
  │     UNCERTAIN → FLAG for legal review
  │
  └─→ Log: MONETIZATION_CHECK (feature, state, result, timestamp)
```

### Currently: ALL features are FREE (paywall disabled)
This guard exists as architecture for future flexibility, not current enforcement. If Marcus ever needs to enable paid features for sustainability, the guard ensures compliance automatically.

---

## WHAT WAS STILL MISSING (Final Gap Analysis)

### Items Identified Across This Entire Conversation That Need To Be In The Project:

1. **PACT Act Deadline Countdown Widget**
   - 38 CFR § 3.317 Gulf War presumptives expire December 31, 2026
   - Every Gulf War era veteran should see a prominent countdown
   - "File before December 31, 2026 to preserve your presumptive eligibility"

2. **Tobacco/Nicotine Dependence Education**
   - 38 U.S.C. § 1103 prohibits direct tobacco-caused disability claims post-1998
   - BUT nicotine dependence acquired during service may itself be claimable
   - AND secondary conditions from nicotine dependence may be claimable
   - This is complex enough to warrant its own FAQ section

3. **Spouse/Dependent Benefits Module**
   - CHAMPVA for dependents of 100% P&T veterans
   - Chapter 35 education for dependents
   - DIC (Dependency and Indemnity Compensation) for survivors
   - Caregiver support program
   - Military spouse career resources (MySECO)

4. **VA Math Calculator**
   - Interactive combined rating calculator showing step-by-step VA math
   - Bilateral factor explanation
   - "What would my rating be if I got X% for this new condition?" estimator
   - Disclaimer: "This is an estimate. Your actual rating may differ."

5. **Claim Prioritization Advisor**
   - Help veterans decide which claims to file first based on:
     - Likelihood of approval (presumptive vs direct)
     - Potential rating impact (combined rating effect)
     - Evidence readiness (do they have what they need?)
     - Deadlines (PACT Act expiration, ITF expiration)
   - NOT legal advice — educational prioritization guidance

6. **Error Recovery System**
   - If AI analysis fails mid-document, save progress and allow resume
   - If upload fails, retry with exponential backoff
   - If PII scrubber flags a false positive, allow veteran to override with confirmation
   - "Something went wrong" screen always includes: what happened, what to try, and manual support contact

7. **Accessibility Testing Protocol**
   - Automated: axe-core in CI/CD pipeline
   - Manual: screen reader testing checklist (VoiceOver, TalkBack, NVDA)
   - User testing: recruit blind/low-vision veteran testers before launch
   - Annual accessibility audit by third-party

8. **Legal Disclaimer System**
   - Not just banners — structured disclaimer on every document generated
   - "This document was prepared using VetAssist, an educational AI writing assistant. VetAssist is not a law firm, claims agent, or medical provider. The factual content was provided by the veteran/writer. For legal advice, consult a VA-accredited representative."
   - Disclaimer version tracking (if wording changes, all previously generated docs are NOT retroactively affected)

9. **Veteran Referral Network**
   - "Know a veteran who needs help?" share button
   - Generates a clean invite link (no PII from the referring veteran)
   - Tracks referral source anonymously for analytics
   - Both referrer and new veteran see a welcome message

10. **Scheduled Maintenance Windows**
    - Knowledge base re-indexing runs during low-traffic hours (2-5 AM EST)
    - Database migrations run during maintenance windows
    - Veterans see "VetAssist is updating its knowledge base" message during re-indexing
    - Core features (cached content, crisis line) always available even during maintenance

11. **Data Export (CCPA/GDPR Compliance)**
    - "Download all my data" button in settings
    - Generates a JSON or PDF package of all veteran-entered data
    - Required by CCPA (California) and good practice everywhere
    - Must complete within 45 days of request (CCPA requirement)

12. **Incident Response Plan**
    - Documented procedure for data breaches
    - FTC notification within 60 days for breaches affecting 500+ users
    - State AG notification where required (varies by state)
    - Veteran notification with what was affected and what to do
    - Template pre-written so response is immediate, not delayed by drafting

---

## RECOMMENDED CLAUDE CODE SKILLS REPOS SUMMARY

| Repo | What to Use | Priority |
|------|------------|----------|
| `anthropics/frontend-design` | UI generation that avoids generic AI look | MANDATORY |
| `anthropics/knowledge-work-plugins` | Knowledge worker patterns, plugin architecture | MANDATORY |
| `obra/superpowers` | TDD, debugging, collaboration patterns | HIGH |
| `alirezarezvani/claude-skills` | Compliance, accessibility, UI design skills (232+) | HIGH |
| `GrizzwaldHouse/cowork-skills` | Marcus's custom skills (integrate your own patterns) | HIGH |
| `ComposioHQ/awesome-claude-skills` | Curated skill directory, reference implementations | MEDIUM |
| `EAIconsulting/cowork-skills-library` | 21 workflow skills, setup wizard pattern | MEDIUM |
| `travisvn/awesome-claude-skills` | webapp-testing, brand-guidelines, skill-creator | MEDIUM |
| `BehiSecc/awesome-claude-skills` | claude-starter (40 auto-activating skills) | REFERENCE |
