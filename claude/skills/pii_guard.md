# PII Guard Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: PII detection patterns, masking rules, zero-retention enforcement, data destruction procedures

---

## DETECTION LAYERS

### Layer 1: Client-Side Regex (Immediate — runs before network transmission)
Patterns detected:
- SSN: `\d{3}-\d{2}-\d{4}`, `\d{9}` (9 consecutive digits), `\d{3}\s\d{2}\s\d{4}`
- Credit cards: Luhn algorithm validation on 13-19 digit sequences
- VA file numbers: C-file patterns `C\d{7,8}`, `c\d{7,8}`
Action: Block text from leaving the device. Show inline warning.

### Layer 2: Server-Side Presidio + Hugging Face NER (Contextual)
Model: `AI-Enthusiast11/pii-entity-extractor` (DeBERTa-based, F1 > 0.95)
Enhanced detection: Names in context, addresses, DOBs in natural language
Action: Redact with black-bar overlay. Log detection event (type + timestamp only).

### Layer 3: AI Pre-Processor (Before Claude API)
Final scan of all text before it enters any AI model context.
Action: Strip any remaining PII patterns. Replace with `[REDACTED]`.

## REDACTION VISUAL TREATMENT

- **Text input fields:** Red border + modal warning explaining what was detected
- **Uploaded documents:** Black rectangular overlay (classified-document style) with white text: `[REDACTED — PROTECTED]`
- **Community posts:** Subtle dark overlay with tooltip: "This content was automatically redacted to protect personal information"

## DATA DESTRUCTION PROTOCOL

When veteran requests deletion:
1. Show pre-deletion screen with list of all data to be destroyed
2. Offer "Download Before Deletion" button (save files to device or send via email/SMS)
3. Require confirmation: "I understand this cannot be undone"
4. Execute secure wipe (overwrite with random data, then delete — not soft delete)
5. Display animated progress bar showing deletion progress in real time
6. Generate deletion certificate (PDF) with: timestamp, data types destroyed, destruction method, certificate ID
7. Offer to download or email the deletion certificate
8. Log the deletion event (certificate ID + timestamp only — no content)

## AUTO-PURGE SCHEDULE

- Analyze-and-destroy files: Purged immediately after analysis completes
- Temporary storage files: Purged after 24 hours (default) or veteran-set timer
- Save-for-later files: Purged after 30 days maximum (failsafe, non-configurable)
- Orphaned session data: Purged nightly by cleanup job
- Warning notifications: Sent at 4 hours, 1 hour, and 15 minutes before auto-purge

## AUDIT LOGGING

Log format (NEVER includes actual PII values):
```
{
  "event_id": "uuid",
  "type": "SSN_DETECTED" | "CC_DETECTED" | "DOB_DETECTED" | "VA_FILE_DETECTED",
  "location": "text_input" | "document_upload" | "community_post" | "ai_response",
  "action": "blocked" | "redacted" | "stripped",
  "timestamp": "ISO-8601",
  "detection_layer": "client_regex" | "server_presidio" | "ai_preprocessor"
}
```
