# PRE-1: MentalRoBERTa Crisis Detector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `callMentalRoBERTa()` stub in `packages/crisis/src/CrisisDetector.ts` with a real FastAPI ML sidecar, add `mlScore` to `CrisisResult`, wire passive corpus logging, and gate merge on 25+ veteran-specific tests passing.

**Architecture:** Three-tier keyword cascade is preserved unchanged. Tier 3 now calls a separate Railway service (`ml-pipeline`) running `mental/mental-roberta-base` via FastAPI. The stub is replaced with a real HTTP call (150ms timeout, 1 retry, silent fallback). A `MlCrisisLogService` writes fire-and-forget corpus entries to Postgres after every detection.

**Tech Stack:** TypeScript (Fastify API, Turborepo), Python 3.11 + FastAPI + HuggingFace `transformers`, Prisma ORM, Postgres (Railway), vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/shared-types/src/types.ts` | Modify line 67 | Add `mlScore?: number` to `CrisisResult` |
| `packages/shared-config/src/constants.ts` | Modify (append) | Add `ML_PIPELINE` constants object |
| `packages/shared-config/src/index.ts` | Modify line 8 | Export `ML_PIPELINE` |
| `packages/crisis/src/CrisisDetector.ts` | Modify lines 74-79, 146-154 | Replace stub, thread `mlScore`, add log call |
| `packages/crisis/src/MlCrisisLogService.ts` | Create | Fire-and-forget Prisma corpus logger |
| `packages/crisis/src/index.ts` | Modify | Export `MlCrisisLogService` |
| `packages/crisis/src/__tests__/CrisisDetector.test.ts` | Create | 25+ veteran-specific vitest cases |
| `prisma/schema.prisma` | Create | Full Prisma schema including `MlCrisisLog` model |
| `apps/ml-pipeline/main.py` | Create | FastAPI app with `/crisis/classify` and `/health` |
| `apps/ml-pipeline/requirements.txt` | Create | Pinned Python dependencies |
| `apps/ml-pipeline/Dockerfile` | Create | python:3.11-slim container |
| `apps/ml-pipeline/railway.json` | Create | Railway deployment config |
| `apps/ml-pipeline/.env.example` | Create | Environment variable documentation |
| `docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx` | Modify | Update PRE-1 tab with locked decisions + Skill Rules section |

---

## Task 1: Add `mlScore` to `CrisisResult`

**Files:**
- Modify: `packages/shared-types/src/types.ts:61-67`

This is foundational — every downstream task depends on this type.

- [ ] **Step 1: Open the file and locate `CrisisResult`**

```bash
grep -n "CrisisResult" packages/shared-types/src/types.ts
```

Expected: line 61 shows `export interface CrisisResult {`

- [ ] **Step 2: Add `mlScore` to the interface**

In `packages/shared-types/src/types.ts`, change lines 61-67 from:

```typescript
export interface CrisisResult {
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly matchedPhrases: readonly string[];
  // Which detection tier triggered: 0=none, 1=hard-regex, 2=phrase-match, 3=MentalRoBERTa
  readonly tier: 0 | 1 | 2 | 3;
}
```

To:

```typescript
export interface CrisisResult {
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly matchedPhrases: readonly string[];
  // Which detection tier triggered: 0=none, 1=hard-regex, 2=phrase-match, 3=MentalRoBERTa
  readonly tier: 0 | 1 | 2 | 3;
  // Raw ML classifier confidence score — only set when Tier 3 fires
  readonly mlScore?: number;
}
```

- [ ] **Step 3: Verify no existing consumers break**

```bash
grep -rn "mlScore\|CrisisResult" packages/ apps/ --include="*.ts" --include="*.tsx"
```

Expected: `CrisisResult` appears in shared-types, crisis, compliance, and any route that returns it. None of these destructure `mlScore` yet — the optional field addition is safe.

- [ ] **Step 4: Typecheck**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo typecheck --filter=@vetassist/shared-types
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/types.ts
git commit -m "feat(shared-types): add mlScore to CrisisResult for Tier 3 ML output"
```

---

## Task 2: Add `ML_PIPELINE` constants to shared-config

**Files:**
- Modify: `packages/shared-config/src/constants.ts` (append after line 132)
- Modify: `packages/shared-config/src/index.ts:8`

- [ ] **Step 1: Append `ML_PIPELINE` to constants.ts**

Add after the last line of `packages/shared-config/src/constants.ts`:

```typescript
// ML pipeline sidecar — MentalRoBERTa FastAPI service on Railway
export const ML_PIPELINE = {
  url: process.env.ML_PIPELINE_URL ?? 'http://ml-pipeline:8001',
  classifyPath: '/crisis/classify',
  healthPath: '/health',
  timeoutMs: 150,
  retryCount: 1,
  retryDelayMs: 0,
} as const;
```

- [ ] **Step 2: Export `ML_PIPELINE` from index.ts**

In `packages/shared-config/src/index.ts`, change line 8 from:

```typescript
export { THRESHOLDS, MODELS, DOCUMENT_LIMITS, CRISIS_LINE, VSO_REFERRAL, UPLOAD_CONFIG, BENEFITS_CONFIG, RESTRICTED_STATES, ANALYTICS_CONFIG, ANALYTICS_EVENTS } from './constants.js';
```

To:

```typescript
export { THRESHOLDS, MODELS, DOCUMENT_LIMITS, CRISIS_LINE, VSO_REFERRAL, UPLOAD_CONFIG, BENEFITS_CONFIG, RESTRICTED_STATES, ANALYTICS_CONFIG, ANALYTICS_EVENTS, ML_PIPELINE } from './constants.js';
```

- [ ] **Step 3: Verify the export resolves**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo typecheck --filter=@vetassist/shared-config
```

Expected: zero errors.

- [ ] **Step 4: Verify no hardcoded `ml-pipeline:8001` exists outside shared-config**

```bash
grep -rn "ml-pipeline:8001\|8001" packages/ apps/ --include="*.ts" --include="*.py" | grep -v "shared-config"
```

Expected: no matches (only shared-config should reference this value).

- [ ] **Step 5: Commit**

```bash
git add packages/shared-config/src/constants.ts packages/shared-config/src/index.ts
git commit -m "feat(shared-config): add ML_PIPELINE constants for MentalRoBERTa sidecar"
```

---

## Task 3: Create Prisma schema with `MlCrisisLog`

**Files:**
- Create: `prisma/schema.prisma`

Note: The Prisma schema does not exist yet. This creates it from scratch.

- [ ] **Step 1: Check if prisma directory exists**

```bash
ls "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project/prisma" 2>/dev/null || echo "NO_PRISMA_DIR"
```

If `NO_PRISMA_DIR`, create the directory:

```bash
mkdir -p "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project/prisma"
```

- [ ] **Step 2: Create `prisma/schema.prisma`**

```prisma
// schema.prisma
// Developer: Marcus Daley
// Date: 2026-05-03
// Purpose: Prisma ORM schema for VetAssist Postgres database

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Corpus logging table for MentalRoBERTa fine-tune pipeline
// Raw text is NEVER stored — only SHA-256 hash for privacy
model MlCrisisLog {
  id          String   @id @default(cuid())
  sessionId   String
  textHash    String
  tier        Int
  mlScore     Float?
  isCrisis    Boolean
  confidence  Float
  bannerShown Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
  @@map("ml_crisis_log")
}
```

- [ ] **Step 3: Verify Prisma is installed**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx prisma --version
```

Expected: version output. If not installed:

```bash
npm install prisma @prisma/client --save-dev
```

- [ ] **Step 4: Run migration**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx prisma migrate dev --name add_ml_crisis_log
```

Expected: migration file created at `prisma/migrations/<timestamp>_add_ml_crisis_log/migration.sql`

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `@prisma/client` generated successfully.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add MlCrisisLog schema for corpus logging"
```

---

## Task 4: Create `MlCrisisLogService`

**Files:**
- Create: `packages/crisis/src/MlCrisisLogService.ts`
- Modify: `packages/crisis/src/index.ts`

- [ ] **Step 1: Create `MlCrisisLogService.ts`**

```typescript
// MlCrisisLogService.ts
// Developer: Marcus Daley
// Date: 2026-05-03
// Purpose: Fire-and-forget corpus logger for MentalRoBERTa training pipeline

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export interface MlCrisisLogEntry {
  readonly sessionId: string;
  readonly rawText: string;
  readonly tier: number;
  readonly mlScore: number | undefined;
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly bannerShown: boolean;
}

// Logs a single detection event to the corpus table.
// Fire-and-forget: never awaited by the caller, never throws.
function logAsync(entry: MlCrisisLogEntry): void {
  const textHash = createHash('sha256').update(entry.rawText).digest('hex');

  prisma.mlCrisisLog
    .create({
      data: {
        sessionId: entry.sessionId,
        textHash,
        tier: entry.tier,
        mlScore: entry.mlScore ?? null,
        isCrisis: entry.isCrisis,
        confidence: entry.confidence,
        bannerShown: entry.bannerShown,
      },
    })
    .catch((err: unknown) => {
      // Corpus logging must never break crisis detection
      console.error('[MlCrisisLogService] failed to write corpus entry:', err);
    });
}

export const MlCrisisLogService = {
  logAsync,
} as const;
```

- [ ] **Step 2: Export from crisis package index**

In `packages/crisis/src/index.ts`, add:

```typescript
// index.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Public exports for @vetassist/crisis package

export { CrisisDetector } from './CrisisDetector.js';
export { MlCrisisLogService } from './MlCrisisLogService.js';
export type { MlCrisisLogEntry } from './MlCrisisLogService.js';
```

- [ ] **Step 3: Typecheck crisis package**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo typecheck --filter=@vetassist/crisis
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add packages/crisis/src/MlCrisisLogService.ts packages/crisis/src/index.ts
git commit -m "feat(crisis): add MlCrisisLogService for fire-and-forget corpus logging"
```

---

## Task 5: Replace `callMentalRoBERTa` stub in `CrisisDetector.ts`

**Files:**
- Modify: `packages/crisis/src/CrisisDetector.ts`

Key facts from reading the live file:
- Stub is at lines 74-79
- Tier 3 branch is at lines 145-155 — checks `mlLevel >= 2` (integer level, not confidence)
- The FastAPI response schema is `{ level: 0|1|2|3, confidence: number }`
- We need to return BOTH `level` (for the `>= 2` gate) AND `confidence` (for `mlScore`)
- So `callMentalRoBERTa` must return `{ level: number; confidence: number }` not just `number`

- [ ] **Step 1: Update the import at line 9**

Change line 9 from:

```typescript
import { THRESHOLDS, CRISIS_LINE } from '@vetassist/shared-config';
```

To:

```typescript
import { THRESHOLDS, CRISIS_LINE, ML_PIPELINE } from '@vetassist/shared-config';
```

- [ ] **Step 2: Replace the stub (lines 74-79) with the real implementation**

Replace lines 74-79:

```typescript
// --- TIER 3: MentalRoBERTa integration point
// Replace this stub with a real HTTP call to your self-hosted FastAPI endpoint:
//   POST http://ml-pipeline:8001/crisis/classify
//   Body: { text: string }
//   Response: { level: 0|1|2|3, confidence: number }
//   Levels: 0=indicator, 1=ideation, 2=behavior, 3=attempt
// Run this tier only when Tier 2 confidence is in the ambiguous 0.4–0.7 range.
async function callMentalRoBERTa(text: string): Promise<number> {
  // STUB — returns 0 until the ML pipeline endpoint is deployed
  // When the endpoint is live, replace this body with the fetch call above
  void text;
  return 0;
}
```

With:

```typescript
// --- TIER 3: MentalRoBERTa — real HTTP call to ml-pipeline Railway service
// Fires only in the ambiguous confidence zone (0.4–0.7) where keywords are insufficient.
// Returns level + confidence from the classifier; falls back silently on any failure.
interface MlResponse {
  readonly level: number;
  readonly confidence: number;
}

async function callMentalRoBERTa(text: string): Promise<MlResponse> {
  const url = `${ML_PIPELINE.url}${ML_PIPELINE.classifyPath}`;

  const attempt = async (): Promise<MlResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ML_PIPELINE.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) return { level: 0, confidence: 0 };
      const data = (await res.json()) as MlResponse;
      return { level: data.level ?? 0, confidence: data.confidence ?? 0 };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch {
    try {
      return await attempt();
    } catch {
      // Both attempts failed — silent fallback, Tiers 1+2 result stands
      return { level: 0, confidence: 0 };
    }
  }
}
```

- [ ] **Step 3: Update the Tier 3 branch (lines 143-155) to thread `mlScore` and call `logAsync`**

Add `MlCrisisLogService` import at the top of the file (after existing imports on line 9):

```typescript
import { MlCrisisLogService } from './MlCrisisLogService.js';
```

Then update `detectCrisis` — replace lines 143-163:

```typescript
  // Tier 3: ambiguous range — call MentalRoBERTa for confirmation
  // Level 2+ (behavior/attempt) triggers crisis response even if phrase score was low
  if (tier2Confidence >= 0.4) {
    const mlLevel = await callMentalRoBERTa(text);
    if (mlLevel >= 2) {
      return {
        isCrisis: true,
        confidence: Math.max(tier2Confidence, 0.80),
        matchedPhrases: matched,
        tier: 3,
      };
    }
  }

  return {
    isCrisis: false,
    confidence: tier2Confidence,
    matchedPhrases: matched,
    tier: tier2Confidence > 0 ? 2 : 0,
  };
```

With:

```typescript
  // Tier 3: ambiguous range — call MentalRoBERTa for confirmation
  // Level 2+ (behavior/attempt) triggers crisis response even if phrase score was low
  if (tier2Confidence >= THRESHOLDS.crisis.confidenceWarn) {
    const ml = await callMentalRoBERTa(text);
    if (ml.level >= 2) {
      return {
        isCrisis: true,
        confidence: Math.max(tier2Confidence, 0.80),
        matchedPhrases: matched,
        tier: 3,
        mlScore: ml.confidence,
      };
    }
    // ML ran but did not confirm crisis — return non-crisis with mlScore for audit
    return {
      isCrisis: false,
      confidence: tier2Confidence,
      matchedPhrases: matched,
      tier: 3,
      mlScore: ml.confidence,
    };
  }

  return {
    isCrisis: false,
    confidence: tier2Confidence,
    matchedPhrases: matched,
    tier: tier2Confidence > 0 ? 2 : 0,
  };
```

- [ ] **Step 4: Wire corpus logging into `detectAndEmit` (lines 170-181)**

Replace `detectAndEmit`:

```typescript
// Full pipeline: detect across all tiers, emit event if crisis, log corpus entry, return result
async function detectAndEmit(input: UserInput): Promise<CrisisResult> {
  const result = await detectCrisis(input.text);

  if (result.isCrisis) {
    await eventBus.emit(EVENTS.CRISIS_DETECTED, {
      sessionId: input.sessionId,
      result,
    });
  }

  // Fire-and-forget corpus log — never awaited, never blocks detection
  MlCrisisLogService.logAsync({
    sessionId: input.sessionId,
    rawText: input.text,
    tier: result.tier,
    mlScore: result.mlScore,
    isCrisis: result.isCrisis,
    confidence: result.confidence,
    bannerShown: result.isCrisis,
  });

  return result;
}
```

- [ ] **Step 5: Typecheck**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo typecheck --filter=@vetassist/crisis
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/crisis/src/CrisisDetector.ts
git commit -m "feat(crisis): replace MentalRoBERTa stub with real HTTP call and corpus logging"
```

---

## Task 6: Create the Python FastAPI `ml-pipeline` service

**Files:**
- Create: `apps/ml-pipeline/main.py`
- Create: `apps/ml-pipeline/requirements.txt`
- Create: `apps/ml-pipeline/Dockerfile`
- Create: `apps/ml-pipeline/railway.json`
- Create: `apps/ml-pipeline/.env.example`

- [ ] **Step 1: Create `apps/ml-pipeline/main.py`**

```python
# main.py
# Developer: Marcus Daley
# Date: 2026-05-03
# Purpose: FastAPI sidecar serving MentalRoBERTa crisis classification for VetAssist

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
log = logging.getLogger(__name__)

MODEL_NAME = "mental/mental-roberta-base"
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/model-cache")

# Module-level model state — loaded once at startup
_tokenizer = None
_model = None
_model_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tokenizer, _model, _model_ready
    log.info("Loading %s from cache dir %s", MODEL_NAME, MODEL_CACHE_DIR)
    try:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=MODEL_CACHE_DIR)
        _model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME, cache_dir=MODEL_CACHE_DIR
        )
        _model.eval()
        _model_ready = True
        log.info("Model loaded successfully")
    except Exception as exc:
        log.error("Model failed to load: %s", exc)
        _model_ready = False
    yield
    log.info("Shutting down ml-pipeline")


app = FastAPI(title="VetAssist ML Pipeline", lifespan=lifespan)


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    level: int
    confidence: float


def _confidence_to_level(confidence: float) -> int:
    if confidence >= 0.85:
        return 3
    if confidence >= 0.70:
        return 2
    if confidence >= 0.50:
        return 1
    return 0


@app.post("/crisis/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest) -> ClassifyResponse:
    if not _model_ready:
        raise HTTPException(status_code=503, detail="model_loading")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="text_required")
    try:
        inputs = _tokenizer(
            req.text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        with torch.no_grad():
            outputs = _model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)
        # Index 1 = crisis class for binary mental health classifiers
        confidence = float(probs[0][1].item())
        level = _confidence_to_level(confidence)
        return ClassifyResponse(level=level, confidence=confidence)
    except Exception as exc:
        log.error("Inference failed: %s", exc)
        raise HTTPException(status_code=500, detail="inference_failed") from exc


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model": "loaded" if _model_ready else "loading"}
```

- [ ] **Step 2: Create `apps/ml-pipeline/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
transformers==4.44.0
torch==2.4.0
pydantic==2.8.0
```

- [ ] **Step 3: Create `apps/ml-pipeline/Dockerfile`**

```dockerfile
# Dockerfile
# Developer: Marcus Daley
# Date: 2026-05-03
# Purpose: Container for VetAssist MentalRoBERTa classification sidecar

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV MODEL_CACHE_DIR=/model-cache
ENV LOG_LEVEL=info

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 4: Create `apps/ml-pipeline/railway.json`**

```json
{
  "build": { "builder": "DOCKERFILE" },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port 8001",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

- [ ] **Step 5: Create `apps/ml-pipeline/.env.example`**

```
MODEL_CACHE_DIR=/model-cache
LOG_LEVEL=info
```

- [ ] **Step 6: Verify Python syntax**

```bash
python3 -c "import ast; ast.parse(open('apps/ml-pipeline/main.py').read()); print('syntax OK')"
```

Expected: `syntax OK`

- [ ] **Step 7: Commit**

```bash
git add apps/ml-pipeline/
git commit -m "feat(ml-pipeline): add MentalRoBERTa FastAPI sidecar for Railway deployment"
```

---

## Task 7: Write the 25+ veteran-specific test suite

**Files:**
- Create: `packages/crisis/src/__tests__/CrisisDetector.test.ts`

- [ ] **Step 1: Create the test directory**

```bash
mkdir -p "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project/packages/crisis/src/__tests__"
```

- [ ] **Step 2: Create the test file**

```typescript
// CrisisDetector.test.ts
// Developer: Marcus Daley
// Date: 2026-05-03
// Purpose: 25+ veteran-specific crisis detection test cases — required gate before merge

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrisisDetector } from '../CrisisDetector.js';
import { MlCrisisLogService } from '../MlCrisisLogService.js';

// Mock MlCrisisLogService so corpus writes don't hit Prisma during tests
vi.mock('../MlCrisisLogService.js', () => ({
  MlCrisisLogService: { logAsync: vi.fn() },
}));

// Default: ML sidecar returns no-crisis (level 0) so keyword tiers are tested in isolation
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mlReturns(level: number, confidence: number) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ level, confidence }),
  });
}

beforeEach(() => {
  mlReturns(0, 0.1); // default: ML says no crisis
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tier 1: Hard regex — method + timeline combos ────────────────────────────
describe('Tier 1 — Hard regex (must never miss)', () => {
  it('detects method + timeline: gun tonight', async () => {
    const result = await CrisisDetector.detectCrisis('I have my gun ready for tonight');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
    expect(result.confidence).toBe(1.0);
  });

  it('detects method + timeline: pills this weekend', async () => {
    const result = await CrisisDetector.detectCrisis('I saved up pills for this weekend');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });

  it('detects service weapon language', async () => {
    const result = await CrisisDetector.detectCrisis('I have my service weapon and I am ready');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });

  it('detects decided + end it', async () => {
    const result = await CrisisDetector.detectCrisis("I've decided to end it this morning");
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });
});

// ─── Tier 2A: High-confidence explicit phrases ────────────────────────────────
describe('Tier 2A — High-confidence phrases (must never miss)', () => {
  it('detects: kill myself', async () => {
    const result = await CrisisDetector.detectCrisis('I want to kill myself');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('detects: end my life', async () => {
    const result = await CrisisDetector.detectCrisis('I just want to end my life');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects: better off dead', async () => {
    const result = await CrisisDetector.detectCrisis('Everyone would be better off dead with me gone');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects veteran farewell: say goodbye', async () => {
    const result = await CrisisDetector.detectCrisis('I need to say goodbye to my family');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects: no reason to live', async () => {
    const result = await CrisisDetector.detectCrisis('There is no reason to live anymore');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });
});

// ─── Tier 2B: Medium-confidence accumulator ───────────────────────────────────
describe('Tier 2B — Medium accumulator (two phrases must exceed threshold)', () => {
  it('two medium phrases exceed block threshold', async () => {
    const result = await CrisisDetector.detectCrisis(
      'I feel completely hopeless and worthless, nothing left for me'
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('veteran burden language accumulates to crisis', async () => {
    const result = await CrisisDetector.detectCrisis(
      'I am a burden and everyone would be better without me'
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });
});

// ─── Tier 3: Veteran idiom in the ML ambiguous zone ──────────────────────────
describe('Tier 3 — Veteran idiom (ML confirms crisis)', () => {
  beforeEach(() => {
    // For this group ML confirms crisis (level 2+)
    mlReturns(2, 0.82);
  });

  it('detects: done with this mission', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I'm done with this mission, all of it, I can't go on"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
    expect(result.mlScore).toBeCloseTo(0.82, 1);
  });

  it('detects: completed my last patrol', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I've completed my last patrol. Nothing left to give"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: already written the letters', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I've already written the letters. No point anymore"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: gave everything over there', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I gave everything I had over there. Nothing left for anyone"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: unit does not need me', async () => {
    const result = await CrisisDetector.detectCrisis(
      "My unit doesn't need me anymore. I can't go on like this"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });
});

// ─── MST and trauma survivor language ─────────────────────────────────────────
describe('MST and trauma context', () => {
  beforeEach(() => {
    mlReturns(2, 0.79);
  });

  it('detects MST survivor language', async () => {
    const result = await CrisisDetector.detectCrisis(
      "After what happened to me I don't see a way out. I can't take it anymore"
    );
    expect(result.isCrisis).toBe(true);
  });

  it('detects disbelief + despair pattern', async () => {
    const result = await CrisisDetector.detectCrisis(
      "No one believed me and I can't go on. I don't see the point"
    );
    expect(result.isCrisis).toBe(true);
  });
});

// ─── False positives — must NOT trigger ───────────────────────────────────────
describe('False positives — must NOT trigger crisis', () => {
  it('rejects: killed it at the gym', async () => {
    const result = await CrisisDetector.detectCrisis('I killed it at the gym today');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: dead tired', async () => {
    const result = await CrisisDetector.detectCrisis("I'm dead tired after that ruck march");
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: murdered the other team', async () => {
    const result = await CrisisDetector.detectCrisis('We absolutely murdered the other team in paintball');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: killing for pizza', async () => {
    const result = await CrisisDetector.detectCrisis("I'm gonna kill for some pizza right now");
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: movie destroyed me emotionally', async () => {
    const result = await CrisisDetector.detectCrisis('That movie destroyed me emotionally, so good');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: this workout is destroying me', async () => {
    const result = await CrisisDetector.detectCrisis('This workout is destroying me in the best way');
    expect(result.isCrisis).toBe(false);
  });
});

// ─── ML sidecar fallback behavior ─────────────────────────────────────────────
describe('ML sidecar fallback behavior', () => {
  it('falls back silently on timeout', async () => {
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));
    // Phrase that lands in ambiguous zone (single medium phrase = 0.35 confidence)
    const result = await CrisisDetector.detectCrisis("I feel hopeless and I don't see a way out");
    // Should not throw, should return a valid result using Tier 2 score
    expect(result).toHaveProperty('isCrisis');
    expect(result.tier).not.toBe(1);
  });

  it('falls back silently on HTTP 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await CrisisDetector.detectCrisis("I feel hopeless and I can't go on");
    expect(result).toHaveProperty('isCrisis');
  });

  it('populates mlScore when ML returns valid response', async () => {
    mlReturns(2, 0.88);
    const result = await CrisisDetector.detectCrisis(
      "I can't go on. I don't see a way out anymore"
    );
    expect(result.tier).toBe(3);
    expect(result.mlScore).toBeCloseTo(0.88, 1);
  });
});

// ─── Corpus logging ───────────────────────────────────────────────────────────
describe('Corpus logging', () => {
  it('calls logAsync after every detectAndEmit', async () => {
    const spy = vi.spyOn(MlCrisisLogService, 'logAsync');
    await CrisisDetector.detectAndEmit({
      text: 'I want to kill myself',
      sessionId: 'test-session-001',
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'test-session-001', isCrisis: true })
    );
  });

  it('logAsync does not throw when Prisma write fails', async () => {
    // This tests MlCrisisLogService directly
    const { MlCrisisLogService: svc } = await import('../MlCrisisLogService.js');
    expect(() =>
      svc.logAsync({
        sessionId: 'test',
        rawText: 'test input',
        tier: 2,
        mlScore: undefined,
        isCrisis: false,
        confidence: 0.3,
        bannerShown: false,
      })
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo test --filter=@vetassist/crisis
```

Expected: all 25+ tests pass. If any fail, fix `CrisisDetector.ts` logic rather than weakening the test.

- [ ] **Step 4: Verify count**

```bash
grep -c "it('" packages/crisis/src/__tests__/CrisisDetector.test.ts
```

Expected: 25 or more.

- [ ] **Step 5: Commit**

```bash
git add packages/crisis/src/__tests__/CrisisDetector.test.ts
git commit -m "test(crisis): add 25+ veteran-specific crisis detection test cases"
```

---

## Task 8: Update `VetAssistBrainstormWizard_DualScope.jsx` with locked PRE-1 decisions

**Files:**
- Modify: `docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx`

The wizard is 1,411 lines. This task makes targeted edits only — do not rewrite the whole file.

- [ ] **Step 1: Locate the PRE-1 Signal Acquisition section**

```bash
grep -n "Signal Acquisition\|Detection strategy\|ensemble\|ML-primary\|keyword-primary" docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx | head -20
```

- [ ] **Step 2: Mark all five PRE-1 decisions as LOCKED**

Find and update each of the following decision options in the wizard to show `[LOCKED]` status:

1. **Signal Acquisition** → mark `ensemble (keyword + ML)` as locked
2. **Model Home** → mark `separate Railway service ml-pipeline` as locked
3. **Fallback** → mark `150ms timeout → 1 retry → silent fallback` as locked
4. **Type contract** → mark `mlScore?: number added to CrisisResult` as locked
5. **Learning** → mark `passive corpus logging now, fine-tune loop later` as locked
6. **Test gate** → mark `25+ veteran-specific cases required` as locked

For each option, add a `locked: true` property or equivalent to the wizard's data structure. The exact change depends on the wizard's option schema — read 20 lines around each grep hit before editing.

- [ ] **Step 3: Add the Skill Rules section to the PRE-1 tab**

Find the last question group in the PRE-1 tab and append a new question group after it:

```jsx
{
  id: 'skill-rules',
  title: 'Brainstorm Wizard Creation Rules',
  question: 'How should future scope artifacts be created for VetAssist features?',
  options: [
    {
      id: 'static-only',
      label: 'Static markdown only',
      description: 'docs/BRAINSTORM_YYYY-MM-DD.md — permanent record, no interactivity',
      locked: false,
    },
    {
      id: 'wizard-only',
      label: 'Interactive React wizard only',
      description: 'docs/artifacts/*.jsx — active decision sessions, no static backup',
      locked: false,
    },
    {
      id: 'both',
      label: 'Both: static markdown + interactive wizard',
      description: 'Static markdown as permanent record + wizard for active sessions — CURRENT LOCKED STANDARD',
      locked: true,
    },
    {
      id: 'auto-generated',
      label: 'Wizard auto-generated from brainstorm transcript',
      description: 'AI generates wizard from session transcript — requires post-processing pipeline',
      locked: false,
    },
    {
      id: 'open-design',
      label: 'Wizard hosted in Open Design (nexu-io/open-design)',
      description: 'Visual companion integration — requires Open Design daemon running locally',
      locked: false,
    },
  ],
}
```

- [ ] **Step 4: Verify file still parses as valid JSX**

```bash
node -e "require('fs').readFileSync('docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx', 'utf8'); console.log('file readable')"
```

Expected: `file readable` (basic syntax check — full JSX parse requires a build tool).

- [ ] **Step 5: Commit**

```bash
git add docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx
git commit -m "docs(wizard): update PRE-1 tab with locked decisions and Skill Rules section"
```

---

## Task 9: Full verification run

Run all verification gates from the design spec in order.

- [ ] **Step 1: Build all packages**

```bash
cd "C:/Users/daley/Projects/VA  Work/vetassist-extracted/vetassist-project" && npx turbo build
```

Expected: zero TypeScript errors across all packages.

- [ ] **Step 2: Run crisis tests**

```bash
npx turbo test --filter=@vetassist/crisis
```

Expected: all 25+ tests pass.

- [ ] **Step 3: Run PII regression**

```bash
npx turbo test:pii
```

Expected: all PII scrubber tests pass (no regression from type changes).

- [ ] **Step 4: Run compliance regression**

```bash
npx turbo test:compliance
```

Expected: all compliance engine tests pass.

- [ ] **Step 5: Typecheck all**

```bash
npx turbo typecheck
```

Expected: zero type errors.

- [ ] **Step 6: Hardcoded value audit**

```bash
grep -rn "ml-pipeline:8001" packages/ apps/ --include="*.ts"
```

Expected: zero matches (only `shared-config/constants.ts` which is a `.ts` file in packages/ — verify it reads from `ML_PIPELINE.url` not a raw string).

```bash
grep -rn "mlScore" packages/ --include="*.ts"
```

Expected: matches only in `shared-types/src/types.ts` and `crisis/src/`.

- [ ] **Step 7: Verify migration exists**

```bash
ls prisma/migrations/
```

Expected: directory contains a timestamped folder with `migration.sql`.

- [ ] **Step 8: Verify Python syntax**

```bash
python3 -c "import ast; ast.parse(open('apps/ml-pipeline/main.py').read()); print('syntax OK')"
```

Expected: `syntax OK`

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat(crisis): wire MentalRoBERTa Tier 3 classifier with corpus logging"
```

---

## Verification Gates Summary

| Gate | Command | Expected |
|------|---------|----------|
| Build | `npx turbo build` | Zero TS errors |
| Crisis tests | `npx turbo test --filter=@vetassist/crisis` | 25+ pass |
| PII regression | `npx turbo test:pii` | All pass |
| Compliance regression | `npx turbo test:compliance` | All pass |
| Typecheck | `npx turbo typecheck` | Zero errors |
| No hardcoded URL | `grep -rn "ml-pipeline:8001" packages/` | Zero raw strings |
| mlScore scope | `grep -rn "mlScore" packages/` | shared-types + crisis only |
| Migration exists | `ls prisma/migrations/` | Timestamped folder present |
| Python syntax | `python3 -c "import ast..."` | syntax OK |
| Wizard updated | `grep -n "skill-rules" docs/artifacts/VetAssistBrainstormWizard_DualScope.jsx` | Match found |
