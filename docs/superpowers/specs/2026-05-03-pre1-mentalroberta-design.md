# PRE-1: MentalRoBERTa Crisis Detector — Design Spec
# Developer: Marcus Daley
# Date: 2026-05-03
# Purpose: Full-stack design for wiring MentalRoBERTa Tier 3 into VetAssist crisis pipeline

---

## Overview

Replace the keyword-based Tier 3 stub in `packages/crisis/src/CrisisDetector.ts` with a
real MentalRoBERTa ML classifier running as a separate Railway service (`ml-pipeline`).
Preserve the three-tier keyword cascade as the safety net. Add passive corpus logging
to support future fine-tuning on veteran-specific crisis language.

**Legal position:** Educational platform under VA OGC 2004 Opinion. Crisis detection is
a safety feature, not a medical diagnosis. All results display the Veterans Crisis Line.

---

## Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Detection strategy | Ensemble: keyword cascade + ML | Keyword tiers never fail silently; ML fills the ambiguous zone |
| ML model | `mental/mental-roberta-base` (HuggingFace) | Trained on mental health text; veteran-specific fine-tune planned |
| Sidecar topology | Separate Railway service `ml-pipeline` | Matches existing stub URL; independent deploy and scaling |
| Fallback behavior | 150ms timeout → 1 retry → silent fallback | Balances latency vs. availability; Tiers 1+2 cover the gap |
| Type contract | Add `mlScore?: number` to `CrisisResult` | Backwards-compatible; audit log needs ML score separate from keyword hits |
| Learning strategy | Passive corpus logging now; fine-tune loop later | Build labeled corpus before retraining; zero MLOps overhead at launch |
| Test gate | 25+ veteran-specific cases, must pass before merge | Non-negotiable safety requirement |

---

## Architecture

### Critical Data Flow

```
USER INPUT
  → Tier 1: Hard regex (confidence: 1.0, sync, <1ms)
      Patterns: method + timeline combos, always returns immediately
  → Tier 2A: High-confidence phrases (confidence: 0.95, sync, <1ms)
      20 phrases: "kill myself", "end my life", veteran-specific idioms
  → Tier 2B: Medium-confidence accumulator (confidence: 0–0.90, sync, <1ms)
      15 phrases: +0.35 each, capped at 0.90
  → [if confidence 0.4–0.69 — ambiguous zone only]
      Tier 3: POST http://ml-pipeline:8001/crisis/classify
        timeout: 150ms → 1 retry → silent fallback (return 0)
        response: { level: 0|1|2|3, confidence: number }
        merged into CrisisResult as mlScore?: number
  → CRISIS_DETECTED event emitted on Observer bus
  → Passive log written to ml_crisis_log (fire-and-forget, never blocks)
  → CrisisLineBanner rendered if isCrisis: true (non-dismissable)
```

### What Changes vs. Today

| Component | Before | After |
|-----------|--------|-------|
| `callMentalRoBERTa()` | Returns `0` (stub) | Real HTTP call with retry/timeout |
| `CrisisResult` type | No ML field | Adds `mlScore?: number` |
| `ml-pipeline` Railway service | Does not exist | Python FastAPI + MentalRoBERTa |
| `ml_crisis_log` Postgres table | Does not exist | Prisma migration, corpus building |
| Test suite | Unknown/sparse | 25+ veteran-specific cases |

### What Does NOT Change

- Tier 1 and Tier 2 keyword logic — untouched
- `CRISIS_DETECTED` event schema — `sessionId + CrisisResult` (backwards compatible)
- `CrisisLineBanner` — non-dismissable, unchanged
- `confidenceBlock: 0.7` and `confidenceWarn: 0.4` thresholds in `shared-config`
- Observer bus wiring — zero changes to event emission

---

## Components

### 1. `packages/shared-types/src/types.ts` — CrisisResult type update

```typescript
export interface CrisisResult {
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly matchedPhrases: readonly string[];
  readonly tier: 0 | 1 | 2 | 3;
  readonly mlScore?: number; // populated only when Tier 3 fires
}
```

Backwards-compatible. All existing consumers either destructure without `mlScore`
or spread the object — neither breaks with an optional addition.

### 2. `packages/crisis/src/CrisisDetector.ts` — Stub replacement

Replace `callMentalRoBERTa()` body:

```typescript
// Real implementation replaces stub
async function callMentalRoBERTa(text: string): Promise<number> {
  const url = `${ML_PIPELINE.url}${ML_PIPELINE.classifyPath}`;
  const attempt = async (): Promise<number> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ML_PIPELINE.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.confidence ?? 0;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await attempt();
  } catch {
    try { return await attempt(); } catch { return 0; }
  }
}
```

After Tier 3 fires, merge `mlScore` into `CrisisResult` before returning.
Write corpus log entry as fire-and-forget (do not await).

### 3. `apps/ml-pipeline/` — New Python FastAPI service

**Endpoint:** `POST /crisis/classify`
- Request: `{ "text": str }`
- Response: `{ "level": int (0–3), "confidence": float }`

**Level mapping:**
- `confidence >= 0.85` → level 3 (severe)
- `confidence >= 0.70` → level 2 (moderate)
- `confidence >= 0.50` → level 1 (mild)
- `confidence < 0.50` → level 0 (none)

**Health check:** `GET /health` → `{ "status": "ok", "model": "loaded"|"loading" }`

**Model loading:** `mental/mental-roberta-base` via HuggingFace `transformers`.
Loaded at startup. Returns 503 until model is ready (Railway healthcheck
timeout: 300s to allow model download on first deploy).

**Key files:**
- `apps/ml-pipeline/main.py` — FastAPI app
- `apps/ml-pipeline/requirements.txt` — pinned dependencies
- `apps/ml-pipeline/Dockerfile` — python:3.11-slim
- `apps/ml-pipeline/railway.json` — Railway deployment config
- `apps/ml-pipeline/.env.example` — `MODEL_CACHE_DIR`, `LOG_LEVEL`

### 4. `packages/shared-config/src/constants.ts` — ML pipeline constants

```typescript
export const ML_PIPELINE = {
  url: process.env.ML_PIPELINE_URL ?? 'http://ml-pipeline:8001',
  classifyPath: '/crisis/classify',
  healthPath: '/health',
  timeoutMs: 150,
  retryCount: 1,
  retryDelayMs: 0,
} as const;
```

Zero hardcoded values anywhere else in the codebase. All callers import
`ML_PIPELINE` from `packages/shared-config`.

### 5. `prisma/schema.prisma` — ml_crisis_log table

```prisma
model MlCrisisLog {
  id          String   @id @default(cuid())
  sessionId   String
  textHash    String   // SHA-256 of input text — raw text never stored
  tier        Int      // 0–3
  mlScore     Float?   // null if Tier 3 did not fire
  isCrisis    Boolean
  confidence  Float
  bannerShown Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
  @@map("ml_crisis_log")
}
```

`MlCrisisLogService` in `packages/crisis/src/MlCrisisLogService.ts`:
- Single `logAsync()` method — fire-and-forget, never throws
- Catches all Prisma errors, logs them, never propagates
- Corpus logging must never block or break crisis detection

### 6. Test suite — `packages/crisis/src/__tests__/CrisisDetector.test.ts`

25+ vitest cases grouped by tier:

| Group | Cases | Purpose |
|-------|-------|---------|
| Tier 1 hard regex | 3+ | Direct method + timeline combos |
| Tier 2A high-confidence | 4+ | Explicit phrases, must never miss |
| Tier 2B accumulator | 2+ | Multi-phrase accumulation |
| Tier 3 veteran idiom | 5+ | ML zone phrases, mock HTTP call |
| MST / trauma context | 2+ | Survivor language patterns |
| False positives | 6+ | Gym, gaming, food — must NOT trigger |
| ML fallback behavior | 3+ | Timeout, 500 error, valid response |
| Corpus logging | 2+ | logAsync called, never throws |

All 25+ must pass: `npx turbo test --filter=crisis`

### 7. `docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx` — Updated wizard

Recreate with all PRE-1 locked decisions reflected in the PRE-1 tab.
Add new "Skill Rules" section covering brainstorm wizard creation standards.
Preserve Buddy Letter Engine tab unchanged.

---

## Data Flow: Corpus Logging

```
detectCrisis(text)
  → [detection runs synchronously through Tiers 1–3]
  → result: CrisisResult assembled
  → MlCrisisLogService.logAsync({
      sessionId,
      textHash: sha256(text),   // raw text never persisted
      tier: result.tier,
      mlScore: result.mlScore,
      isCrisis: result.isCrisis,
      confidence: result.confidence,
      bannerShown: result.isCrisis,
    })                          // fire-and-forget, no await
  → return result               // caller never waits for log
```

Privacy guarantee: only SHA-256 hash of input text stored, never raw text.
This satisfies SSN-never-stored rule and veteran privacy standards.

---

## Error Handling

| Failure Mode | Behavior |
|-------------|----------|
| ML sidecar down (Railway cold start) | Tier 3 returns 0, Tiers 1+2 result used |
| ML call timeout (>150ms) | Abort, retry once, return 0 on second timeout |
| ML returns non-200 | Return 0 silently, log error |
| ML returns malformed JSON | Return 0 silently, log error |
| Prisma log write fails | Catch error, log it, never propagate |
| Model still loading (503) | Treated same as non-200 — return 0 |

**Invariant:** Crisis detection NEVER throws. Every failure path returns a
valid `CrisisResult` with `isCrisis` determined by Tiers 1+2 alone.

---

## Verification Gates

All must pass before merge:

1. `npx turbo build` — zero TypeScript errors
2. `npx turbo test --filter=crisis` — all 25+ cases pass
3. `npx turbo test:pii` — PII scrubber regression clean
4. `npx turbo test:compliance` — compliance engine regression clean
5. `npx turbo typecheck` — zero type errors
6. `grep -r "ml-pipeline:8001" packages/` — only in shared-config
7. `grep -r "mlScore" packages/` — only in shared-types and crisis
8. Prisma migration file exists in `prisma/migrations/`
9. `apps/ml-pipeline/main.py` parses without syntax errors
10. `docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx` updated

---

## Coding Standards (Marcus Daley Universal Standards)

- File header on every new file: filename, Developer: Marcus Daley, date, purpose
- Single-line comments only (`//`) — never block comments
- Zero hardcoded values — all from `packages/shared-config` or env vars
- Zero magic numbers or strings — named constants only
- Most restrictive access by default
- No public mutable state — getters only for external reads

---

## Commit Message

```
feat(crisis): wire MentalRoBERTa Tier 3 classifier with corpus logging
```

No Co-Authored-By lines. No Claude attribution.

---

## Future: Fine-Tune Loop (Phase B)

Once `ml_crisis_log` has accumulated sufficient veteran-specific labeled examples:
1. Admin UI surfaces false positive / false negative flags from the log
2. Flagged examples enter a human review queue
3. Approved examples feed a fine-tuning job (HuggingFace AutoTrain or custom)
4. New model version deployed to `ml-pipeline` Railway service
5. `ML_PIPELINE` constants updated with new model version pin

No MLOps infrastructure required until Phase B begins.
