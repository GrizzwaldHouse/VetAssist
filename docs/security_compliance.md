# Security & Compliance Documentation
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Security policies, data handling, and regulatory compliance for VetAssist

---

## SECURITY POLICIES

### Encryption
- **In transit:** TLS 1.3 minimum on all connections
- **At rest:** AES-256 for all stored files (temporary encrypted storage)
- **Keys:** Encryption keys stored in environment variables, never in code

### Authentication
- **Provider:** Auth0 (OAuth 2.0)
- **Methods:** Email/password, Google OAuth, Apple Sign-In
- **MFA:** Optional but encouraged for accounts with stored claim data
- **Sessions:** JWT tokens with configurable expiration

### Input Security
- **Validation:** Zod schemas on all API inputs — reject malformed requests
- **Sanitization:** HTML entities escaped, SQL injection prevented via Prisma ORM parameterized queries
- **Rate limiting:** Configurable per-endpoint (default: 100 requests/minute)
- **File upload:** Max 25MB, accepted MIME types whitelist, virus scan consideration for production

### PII Protection (Three-Layer Defense)
- **Layer 1 (Client):** Regex-based SSN/CC detection — blocks PII from leaving the device
- **Layer 2 (Server):** Microsoft Presidio + Hugging Face NER — contextual detection
- **Layer 3 (AI Pre-processor):** Final strip before any text enters AI model context
- **Policy:** Accept documents with PII, auto-redact, warn user, log event (never log PII value)

### Data Destruction
- **Method:** Secure wipe — overwrite file with random data, then delete (not soft delete)
- **Auto-purge:** Default 24h, max 30d, orphan cleanup nightly
- **Certificate:** Auto-generated PDF proving destruction (timestamp, types, method, certificate ID)
- **Audit:** Deletion events logged (certificate ID + timestamp only)

### Dependency Security
- **Lock files:** package-lock.json committed for reproducible builds
- **Auditing:** `npm audit` in CI/CD pipeline, block on critical vulnerabilities
- **Secret detection:** git-secrets pre-commit hook, CI scan for leaked credentials
- **Updates:** Dependabot or Renovate for automated dependency updates

---

## REGULATORY COMPLIANCE

### FTC Health Breach Notification Rule (16 CFR Part 318)
- **Applicability:** VetAssist is a direct-to-consumer wellness/educational app, NOT a HIPAA covered entity
- **Requirements:** Breach notification procedures, security incident response plan
- **Implementation:** Documented incident response plan, 60-day notification timeline, FTC notification for breaches affecting 500+ users

### California Consumer Privacy Act (CCPA/CPRA)
- **Requirements:** Right to delete, right to know, opt-out of data sale, privacy policy
- **Implementation:** Data deletion system, data export functionality, no data sales (ever), published privacy policy

### AI Disclosure Laws
- **California AB 489:** No implied healthcare licensure in UI or branding
- **California SB 243:** Crisis detection and Veterans Crisis Line referral on all AI screens
- **Texas TRAIGA:** AI transparency disclosures for Texas users
- **FTC Section 5:** No deceptive claims about AI capabilities
- **Implementation:** AI disclosure banner persistent on all AI-powered screens, crisis line integration, no medical/legal language in AI responses

### Claims Assistance Legal Boundary
- **Law:** 38 U.S.C. § 5904 and 38 CFR § 14.636
- **VetAssist position:** Educational platform and document preparation tool — NOT claims representation
- **Safe activities:** Educational content, writing assistance (Grammarly-style), benefit discovery, community forum
- **Prohibited:** Filing claims for veterans, providing legal advice, guaranteeing outcomes, charging fees contingent on claim results

### Accessibility
- **Standard:** WCAG 2.1 Level AA minimum
- **Section 508:** Compliance for potential federal partnerships
- **Testing:** axe-core automated auditing in CI/CD, manual screen reader testing
- **Published:** Accessibility Statement accessible from every page

### Content Moderation
- **Published:** Content Moderation Policy accessible from community section
- **Automated:** PII detection, toxicity filtering, spam detection
- **Manual:** Admin moderation queue, community reporting, appeal process
- **Escalation:** Admin lockdown toggle for full manual approval when needed

### Data Handling Summary

| Data Type | Stored? | Encrypted? | Retention | Deletion |
|-----------|---------|------------|-----------|----------|
| SSNs | NEVER | N/A | Zero | N/A |
| Chat conversations | Session only | Yes (transit) | Session duration | Auto-purge |
| Uploaded documents | Temp only | AES-256 | 24h default, 30d max | Secure wipe |
| Community posts | Persistent | Yes (at rest) | Until user deletes | Secure wipe |
| Analytics | Anonymized | Yes (at rest) | 24 months | Standard delete |
| Account data | Persistent | Yes (at rest) | Until user deletes | Secure wipe + certificate |
| Deletion certificates | Persistent | Yes (at rest) | Indefinite | User request only |
