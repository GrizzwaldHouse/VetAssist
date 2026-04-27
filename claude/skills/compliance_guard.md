# Compliance Guard Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Rules for the Compliance Engine middleware — every AI response passes through before display

---

## ARCHITECTURE

The Compliance Engine is event-driven middleware. It subscribes to `AI_RESPONSE_GENERATED` events and evaluates each response before the UI receives it.

## CHECKS (Run in order)

### 1. Crisis Detection (HIGHEST PRIORITY — runs first)
Scan for: suicide, self-harm, hopelessness, "give up", "end it", "no point", "can't go on"
Action: IMMEDIATELY prepend Veterans Crisis Line resources:
- "If you're in crisis: Call 988, Press 1 | Text 838255 | Chat VeteransCrisisLine.net"
Log: Crisis event (timestamp only, no content)

### 2. PII Detection
Scan AI output for SSN patterns, names, addresses
Action: Mask before display (should never happen, but defense in depth)

### 3. Medical Advice Detection
Scan for: "you have [condition]", "you suffer from", "your diagnosis is", "you should take [medication]", "stop taking", "increase your dosage"
Action: Block response, regenerate with instruction: "Rephrase as educational — describe what the CFR says, do not diagnose the veteran"

### 4. Legal Advice Detection
Scan for: "you should file", "you need to appeal", "your case is strong enough", "you will win", "I recommend filing"
Action: Append disclaimer + rephrase directive language to educational: "Based on 38 CFR § X.XXX, veterans in similar situations have pursued..."

### 5. Outcome Guarantee Detection
Scan for: "you will get", "guaranteed", "you qualify for X%", "you are entitled to", "you should receive"
Action: Block and regenerate with conditional language: "you may be eligible", "the criteria include", "veterans with similar conditions have received"

### 6. Confidence Scoring
Evaluate: Is the response grounded in RAG knowledge base citations, or general knowledge?
Action:
- High confidence (specific CFR/M21-1 match): Display normally
- Medium confidence (general VA guidance): Display with note
- Low confidence: Append "I want to be transparent — please verify this with VA.gov or a VSO before acting on it"

## EVENT FLOW

```
USER_INPUT_RECEIVED
  → PII_SCANNER (Layer 1: client regex)
    → PII detected? → BLOCK + WARN
    → Clean? → CRISIS_DETECTOR
      → Crisis detected? → PREPEND CRISIS RESOURCES
      → REQUEST_CLASSIFIER → route to correct handler
        → AI_PROCESSING_STARTED → UI shows loading
          → AI_RESPONSE_GENERATED → COMPLIANCE_ENGINE
            → All checks pass? → COMPLIANCE_PASSED → UI displays response
            → Check failed? → COMPLIANCE_FAILED → regenerate or modify
```

## NON-NEGOTIABLE RULES

- Crisis resources are NEVER suppressed or delayed
- PII is NEVER passed through to the user
- Medical diagnoses are NEVER made by the AI
- Legal advice is NEVER given — only educational information
- Rating outcomes are NEVER guaranteed
- Every response that reaches the user has passed ALL checks
