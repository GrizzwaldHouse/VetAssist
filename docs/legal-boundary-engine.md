# VetAssist Legal Boundary Engine Specification
# Developer: Marcus Daley
# Date: 2026-04-20
# Purpose: Compliance-first implementation spec for all regulatory guardrails.
# This expands the Compliance Engine with the full legal boundary, data classification,
# and regulatory detection systems required for VetAssist's legal posture.

---

## GOVERNING REGULATIONS

| Regulation | Domain | Implementation Required |
|------------|--------|------------------------|
| 38 U.S.C. § 5904 | VA claims assistance prohibition | Legal Boundary Engine |
| 38 CFR § 14.636 | Fee prohibition before initial decision | Legal Boundary Engine |
| 38 U.S.C. § 7332 | Heightened VA data protection | Data Classification System |
| 42 CFR Part 2 | Substance use disorder (SUD) data | Data Classification System |
| FTC Section 5 | No deceptive AI capability claims | AI Disclosure + Compliance Engine |
| California AB 489 | No implied healthcare licensure | AI Disclosure |
| California SB 243 | Crisis detection + Crisis Line referral | Crisis Detection Engine |
| Texas TRAIGA | AI transparency for Texas users | AI Disclosure |
| CCPA/CPRA | Right to delete, opt-out | Data Destruction + Consent Engine |
| FTC Health Breach Notification (16 CFR Part 318) | Breach notification | Security Incident Response |
| WCAG 2.1 AA | Accessibility | UI System |

---

## 1. DATA CLASSIFICATION SYSTEM

Location: `packages/shared-types/src/data-classification.ts`

```typescript
// filename: data-classification.ts
// developer: Marcus Daley
// date: 2026-04-20
// purpose: Data sensitivity classification enum and handling rules

export enum DataClassification {
  GENERAL = 'GENERAL',             // Public info, educational content, regulations
  PII = 'PII',                     // Name, email, address, DOB — never store raw
  PHI = 'PHI',                     // Health info — encrypt + audit log required
  SUD = 'SUD',                     // Substance use disorder — 42 CFR Part 2 protections
  VA_SENSITIVE_7332 = 'VA_7332',   // 38 U.S.C. § 7332 — highest protection level
}

export interface ClassifiedData {
  readonly classification: DataClassification;
  readonly value: never;           // Never expose raw value — use redactedPreview only
  readonly redactedPreview: string; // e.g., "***-**-1234" for SSN
  readonly detectedAt: Date;
  readonly auditId: string;        // Log this, never the value
}

// Handling rules per classification
export const DATA_HANDLING_RULES = {
  [DataClassification.GENERAL]: {
    canStore: true,
    encryptionRequired: false,
    auditRequired: false,
    maxRetentionDays: null,         // No limit
  },
  [DataClassification.PII]: {
    canStore: false,               // Never store raw PII
    encryptionRequired: true,
    auditRequired: true,
    maxRetentionDays: 30,
  },
  [DataClassification.PHI]: {
    canStore: false,
    encryptionRequired: true,
    auditRequired: true,            // Every access logged
    maxRetentionDays: 0,            // Session only
  },
  [DataClassification.SUD]: {
    canStore: false,
    encryptionRequired: true,
    auditRequired: true,
    maxRetentionDays: 0,            // Session only — 42 CFR Part 2
    requiresExplicitConsent: true,
    prohibitedDisclosures: ['law enforcement', 'employers', 'insurers'],
  },
  [DataClassification.VA_SENSITIVE_7332]: {
    canStore: false,
    encryptionRequired: true,
    auditRequired: true,
    maxRetentionDays: 0,
    prohibitedDisclosures: ['*'],   // No disclosure to anyone under any circumstance
  },
} as const;
```

---

## 2. LEGAL BOUNDARY ENGINE

Location: `packages/ai-engine/src/legal-boundary-checker.ts`

### Detection Rules

The Legal Boundary Engine sits between the Compliance Engine and user delivery. It detects when AI output crosses from education into "practice before the VA."

```typescript
// What triggers a LEGAL_BOUNDARY_TRIGGERED event

const LEGAL_BOUNDARY_PATTERNS = {
  claimStrategy: [
    // Phrases that constitute claims strategy — blocked
    /you should (file|claim|pursue)/i,
    /I recommend (filing|claiming)/i,
    /your best strategy (is|would be)/i,
    /to maximize your rating/i,
    /you (should|need to) include .* in your claim/i,
  ],

  eligibilityDetermination: [
    // Specific eligibility conclusions for THIS veteran — blocked
    /you (are|aren't) eligible for/i,
    /you (qualify|don't qualify) for/i,
    /based on what you've told me, you should (get|receive)/i,
    /you would (get|receive|be entitled to) .* percent/i,
  ],

  filingGuidance: [
    // Step-by-step filing advice tailored to this veteran — blocked
    /you should file (VA Form|a claim) for/i,
    /file for .* (first|before|after)/i,
    /submit .* as (your|a) primary claim/i,
  ],

  outcomeGuarantee: [
    // Any suggestion of guaranteed outcomes — blocked
    /you('ll| will) (get|receive|be approved)/i,
    /you're (definitely|certainly|sure to)/i,
    /guaranteed to (get|receive|qualify)/i,
    /100% (chance|likely|certain)/i,
  ],

  feePromotion: [
    // Promoting paid claims services — blocked + admin alert
    /pay .* (VSO|attorney|claim|agent|company)/i,
    /hire .* for (your claim|VA benefits)/i,
    /claims (consultant|coach|company) for a fee/i,
  ],
} as const;

// What IS allowed (educational responses)
const ALLOWED_EDUCATIONAL_PATTERNS = {
  generalEducation: 'explains what a regulation says for any veteran',
  evidenceTypes: 'describes what evidence types are typically relevant to condition types in general',
  optionExplanation: 'neutrally explains what options exist (Supplemental, HLR, Board)',
  combinedRatingMath: 'shows how VA math works in general',
  processExplanation: 'describes how the claims process works step by step',
};
```

### Event Flow

```
AI_RESPONSE_GENERATED event
  │
  ├─→ Compliance Engine (crisis, medical, legal language)
  │
  ├─→ Legal Boundary Engine
  │     ├─ Pattern match against LEGAL_BOUNDARY_PATTERNS
  │     ├─ If match: emit LEGAL_BOUNDARY_TRIGGERED
  │     │     ├─ Log: pattern type + timestamp (no PII, no response content)
  │     │     ├─ Block response delivery
  │     │     └─ Return safe redirect message:
  │     │          "For advice specific to your situation, I recommend connecting with
  │     │           a VA-accredited VSO, attorney, or claims agent — they can give
  │     │           you personalized guidance that I'm not able to provide."
  │     └─ If no match: emit LEGAL_BOUNDARY_PASSED
  │
  └─→ COMPLIANCE_PASSED → deliver to user
```

### Redirect Message Templates (Safe Responses)

When a boundary is triggered, replace the blocked response with one of these depending on context:

**For claims strategy questions:**
> "I can explain how [topic] works in general, but giving advice specific to your situation is something a VA-accredited VSO or claims agent is better equipped to help with. Would you like me to explain the general process, or help you find a free VSO near you?"

**For eligibility questions:**
> "Eligibility depends on your specific service records, medical history, and circumstances — which means it's really a question for a qualified representative to review. What I can do is explain what the general eligibility criteria are for [benefit] so you know what to look for."

**For outcome questions:**
> "VA outcomes depend on so many individual factors that I can't predict what would happen in your case. What I can explain is how the rating process works and what factors VA considers, so you can make informed decisions."

---

## 3. CRISIS DETECTION ENGINE

Location: `packages/ai-engine/src/crisis-detector.ts`

### Detection Strategy

Two-layer approach: keyword pre-filter (fast, before AI) + sentiment analysis (AI-powered, catches subtle signals).

```typescript
// Layer 1 — Pre-AI keyword filter (runs client-side and server-side)
const CRISIS_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'don\'t want to be here',
  'can\'t go on', 'no reason to live', 'better off dead', 'end it all',
  'suicide', 'self-harm', 'hurt myself', 'cut myself',
  // Veteran-specific signals
  'can\'t fight anymore', 'lost the battle', 'mission failed',
];

// Layer 2 — AI sentiment (runs server-side on flagged or ambiguous inputs)
// Prompt: "Does this message indicate suicidal ideation, self-harm intent, or crisis?
//          Answer only YES or NO. Message: [input]"
// Model: CLAUDE_MODEL_FAST (haiku — fast classification)
// If AI returns YES → CRISIS_DETECTED
```

### Behavior on Detection

```
CRISIS_DETECTED event
  │
  ├─→ INTERRUPT — do not process original request
  ├─→ Do not send input to main AI pipeline
  ├─→ Log: CRISIS_DETECTED event (timestamp only, no content)
  │
  ├─→ Return ONLY this response (no other AI content):
  │     {
  │       type: 'CRISIS_INTERRUPT',
  │       message: 'Veterans Crisis Line: Dial 988 (Press 1), Text 838255, or Chat at VeteransCrisisLine.net',
  │       phoneNumber: '988',
  │       textNumber: '838255',
  │       chatUrl: 'https://www.veteranscrisisline.net',
  │     }
  │
  └─→ UI renders CrisisInterruptOverlay (full-screen, non-dismissable without confirmation)
```

### False Positive Prevention

```typescript
// Phrases that look like crisis but are NOT:
const CRISIS_FALSE_POSITIVES = [
  'I don\'t see the point in filing online',
  'lost the battle over my claim',
  'fighting for my benefits',
  'mission to get my rating',
];
// The Layer 2 AI check handles these — keyword alone never triggers the interrupt
```

---

## 4. ENHANCED COMPLIANCE ENGINE SPECIFICATION

Location: `packages/ai-engine/src/compliance-checker.ts`

All checks run on every AI response. Order matters — crisis check first.

```typescript
export interface ComplianceCheckResult {
  readonly passed: boolean;
  readonly failedChecks: ComplianceCheckType[];
  readonly safeResponse?: string;    // Replacement response if failed
}

export enum ComplianceCheckType {
  CRISIS_LANGUAGE = 'CRISIS_LANGUAGE',
  MEDICAL_DIAGNOSIS = 'MEDICAL_DIAGNOSIS',
  LEGAL_ADVICE = 'LEGAL_ADVICE',
  OUTCOME_GUARANTEE = 'OUTCOME_GUARANTEE',
  LEGAL_BOUNDARY = 'LEGAL_BOUNDARY',          // 38 U.S.C. § 5904
  FEE_PROMOTION = 'FEE_PROMOTION',            // Promoting paid services
  SUD_DISCLOSURE = 'SUD_DISCLOSURE',          // 42 CFR Part 2
  DECEPTIVE_CAPABILITY = 'DECEPTIVE_CAPABILITY', // FTC Section 5
}

// Check order (run sequentially — first failure exits early for crisis)
const CHECK_ORDER: ComplianceCheckType[] = [
  ComplianceCheckType.CRISIS_LANGUAGE,         // Must be first — safety critical
  ComplianceCheckType.SUD_DISCLOSURE,          // 42 CFR Part 2 — legal critical
  ComplianceCheckType.MEDICAL_DIAGNOSIS,
  ComplianceCheckType.OUTCOME_GUARANTEE,
  ComplianceCheckType.LEGAL_BOUNDARY,
  ComplianceCheckType.FEE_PROMOTION,
  ComplianceCheckType.LEGAL_ADVICE,
  ComplianceCheckType.DECEPTIVE_CAPABILITY,
];
```

---

## 5. API INTEGRATION READINESS (VA Lighthouse)

Location: `apps/api/src/services/va-lighthouse.ts` (stub — implement when API access approved)

```typescript
// VA Lighthouse API — OAuth 2.0 with ID.me or Login.gov
// Documentation: https://developer.va.gov
// Status: Prepare integration point now, enable when VA API access granted

export interface VALighthouseConfig {
  readonly baseUrl: string;          // from env: VA_LIGHTHOUSE_BASE_URL
  readonly clientId: string;         // from env: VA_LIGHTHOUSE_CLIENT_ID
  readonly scopes: string[];         // 'veteran_verification.read', 'disability_rating.read'
  readonly environment: 'sandbox' | 'production';
}

// Endpoints to prepare stubs for:
// GET /veteran_verification/v1/status         — verify veteran status
// GET /disability_rating/v1/disabilities      — read disability ratings (with consent)
// GET /benefits_claims/v1/claims              — read claim status

// Auth flow: OAuth 2.0 PKCE → redirect to VA.gov login → receive token → use for API calls
// User consent: MUST be explicit before any VA API call — display what data will be accessed
```

---

## 6. TESTING REQUIREMENTS (Phase Completion Gates)

### Legal Boundary Tests
```typescript
// tests/legal-boundary.test.ts

describe('Legal Boundary Engine', () => {
  // MUST BLOCK
  test('blocks claim strategy advice', async () => {
    const response = 'You should file for PTSD first, then knee pain';
    expect(await legalBoundaryEngine.check(response)).toEqual({ passed: false });
  });

  test('blocks eligibility determination', async () => {
    const response = 'Based on what you told me, you are eligible for 70%';
    expect(await legalBoundaryEngine.check(response)).toEqual({ passed: false });
  });

  test('blocks outcome guarantee', async () => {
    const response = 'You will definitely get service connected for that';
    expect(await legalBoundaryEngine.check(response)).toEqual({ passed: false });
  });

  // MUST PASS (educational responses)
  test('allows general regulation explanation', async () => {
    const response = 'Under 38 CFR § 3.304(f), PTSD can be service connected when...';
    expect(await legalBoundaryEngine.check(response)).toEqual({ passed: true });
  });

  test('allows neutral options explanation', async () => {
    const response = 'After a denial, veterans have three options: Supplemental Claim, HLR, or Board Appeal';
    expect(await legalBoundaryEngine.check(response)).toEqual({ passed: true });
  });
});
```

### Crisis Detection Tests
```typescript
describe('Crisis Detection Engine', () => {
  test('detects explicit crisis language', async () => {
    expect(await crisisDetector.check('I want to end my life')).toBe(true);
  });

  test('does not flag non-crisis frustration', async () => {
    expect(await crisisDetector.check('I don\'t see the point in filing online anymore')).toBe(false);
  });

  test('detects veteran-specific crisis language', async () => {
    expect(await crisisDetector.check('I\'ve lost the battle, I can\'t fight anymore')).toBe(true);
  });
});
```

### Data Classification Tests
```typescript
describe('Data Classification', () => {
  test('SSN classified as PII, never stored', async () => {
    const result = await dataClassifier.classify('123-45-6789');
    expect(result.classification).toBe(DataClassification.PII);
    expect(result.value).toBeUndefined();  // value field must not exist on ClassifiedData
  });

  test('SUD keywords trigger 42 CFR Part 2 classification', async () => {
    const result = await dataClassifier.classify('I was treated for alcohol use disorder');
    expect(result.classification).toBe(DataClassification.SUD);
  });
});
```

---

## 7. ARCHITECTURE ADDITIONS FROM EXPANDED DIRECTIVE

Add these missing pieces to the monorepo based on the expanded compliance requirements:

### New Package: `packages/security`
```
packages/security/src/
  data-classifier.ts        # DataClassification enum + classifier
  legal-boundary-checker.ts # 38 U.S.C. § 5904 pattern matcher
  crisis-detector.ts        # Multi-layer crisis detection
  audit-logger.ts           # Structured audit log (event type + timestamp, NEVER content)
  incident-responder.ts     # FTC Health Breach Notification trigger logic
```

### Events to Add to Event System
```
LEGAL_BOUNDARY_TRIGGERED (pattern_type, timestamp)
CRISIS_DETECTED (timestamp)  // NO content in payload
SUD_DATA_DETECTED (timestamp)
PHI_DETECTED (timestamp)
VA_7332_DATA_DETECTED (timestamp)
COMPLIANCE_VIOLATION (check_type, timestamp)
SECURITY_INCIDENT_DETECTED (incident_type, timestamp)
```

### WebSocket Architecture (Community Real-Time)
```
Veteran client → TLS 1.3 WebSocket → Fastify WebSocket plugin
  → Auth middleware (JWT required)
  → Rate limiter (community post limits from config)
  → PII middleware on every outbound message
  → CRISIS_DETECTED check on every inbound message
  → Graduated response system on violation detection
```
