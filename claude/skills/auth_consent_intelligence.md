# Auth, Consent & Intelligence Skill
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Authentication, veteran identity, consent engine, insight generation, and report distribution

---

## AUTHENTICATION SYSTEM

### Methods
- **Email/password** — standard registration with email verification
- **Magic link** — passwordless login via emailed one-time link (elder-friendly)
- **Bot protection** — Cloudflare Turnstile (accessible, privacy-respecting alternative to reCAPTCHA)

### User Entity
```typescript
interface User {
  id: string;           // UUID, never sequential
  email: string;        // Encrypted at rest
  isVerified: boolean;  // Email verification status
  displayName?: string; // Optional, for community posts
  createdAt: Date;
  lastLoginAt: Date;
}
```

### Security Rules
- Rate limit: 5 login attempts per 15 minutes per IP
- Magic links expire after 15 minutes
- Password requirements: minimum 8 characters, no complexity theater
- Session tokens: JWT with 24-hour expiration, refresh token rotation
- All auth events logged: USER_REGISTERED, USER_LOGGED_IN, USER_LOGGED_OUT

---

## VETERAN PROFILE SYSTEM (Optional + Consent Required)

Veterans MAY provide service information to unlock personalized insights. This is NEVER required. All fields are optional.

### Branch Role Mapping (MANDATORY if branch is provided)

Each military branch uses different terminology for job classifications. The system MUST use the correct term:

| Branch | Role Classification Term | Example |
|--------|------------------------|---------|
| Navy | Rating | IT (Information Systems Technician), TM (Torpedoman's Mate) |
| Army | MOS (Military Occupational Specialty) | 11B (Infantryman), 68W (Combat Medic) |
| Marine Corps | MOS | 0311 (Rifleman), 0621 (Radio Operator) |
| Air Force | AFSC (Air Force Specialty Code) | 1A1X1 (Flight Engineer), 3D0X2 (Cyber Systems) |
| Space Force | SFSC (Space Force Specialty Code) | 5S0X1 (Space Systems Operations) |
| Coast Guard | Rating | BM (Boatswain's Mate), ME (Maritime Enforcement) |

### Data Model
```typescript
interface VeteranProfile {
  userId: string;
  branch?: Branch;
  roleCode?: string;          // MOS, Rating, AFSC, or SFSC
  roleDisplayName?: string;   // Human-readable role name
  yearsServed?: string;       // Range: "1-4", "5-10", "11-20", "20+"
  serviceEra?: ServiceEra;    // Vietnam, Gulf War, Post-9/11, etc.
  consentToResearch: boolean; // MUST be explicitly set
  consentToAnalytics: boolean;
  consentToCommunity: boolean;
}

enum Branch {
  NAVY = "Navy",
  ARMY = "Army",
  MARINE_CORPS = "Marine Corps",
  AIR_FORCE = "Air Force",
  SPACE_FORCE = "Space Force",
  COAST_GUARD = "Coast Guard"
}

enum ServiceEra {
  VIETNAM = "Vietnam Era",
  GULF_WAR = "Gulf War Era",
  POST_911 = "Post-9/11",
  PEACETIME = "Peacetime",
  OTHER = "Other"
}
```

### Privacy Rules
- Profile data encrypted at rest
- Profile is NEVER shared with other users (only aggregated anonymized data used in insights)
- Profile can be deleted at any time (triggers full data destruction pipeline)
- Branch and role info used ONLY for personalized benefit suggestions and anonymized pattern detection

---

## CONSENT ENGINE (CRITICAL — MUST BE IMPLEMENTED BEFORE ANY DATA COLLECTION)

### Principle
NO data is collected, stored, or analyzed for research/analytics purposes without explicit, granular, revocable consent.

### Consent Model
```typescript
interface ConsentRecord {
  userId: string;
  consentGiven: boolean;
  scope: ConsentScope[];
  timestamp: Date;
  version: string;     // Consent policy version (track changes)
  ipAddress?: string;  // Optional, for audit trail
}

type ConsentScope = "analytics" | "research" | "community";
```

### Consent Rules

| Scope | What It Enables | What Happens Without It |
|-------|----------------|----------------------|
| analytics | Anonymous feature usage tracking | No usage data collected for this user |
| research | Anonymized role → condition pattern detection | User's profile data excluded from insight engine |
| community | Posting stories, comments, upvotes | Can read but not post in community section |

### Enforcement Logic
```
IF consent.analytics === false:
  → PostHog tracks NOTHING for this user
  → Session data destroyed after request completes

IF consent.research === false:
  → User's profile and testimonials EXCLUDED from insight engine
  → No role/condition mapping generated from their data

IF consent.community === false:
  → User can READ community content
  → User CANNOT post, comment, or upvote
```

### Consent UX
- Presented during onboarding with plain-language explanations
- Each scope has its own toggle (NOT bundled consent)
- Changeable anytime in Settings
- Changes take effect immediately
- Withdrawal triggers deletion of previously collected data for that scope

### Events
- CONSENT_GRANTED (scope, timestamp)
- CONSENT_WITHDRAWN (scope, timestamp, data_deletion_triggered)
- CONSENT_VERSION_UPDATED (old_version, new_version)

---

## INSIGHT ENGINE (Pattern Detection from Anonymized Community Data)

### Purpose
Identify patterns between military roles, repetitive service activities, and commonly reported conditions. This helps veterans discover connections they might not have considered.

### Data Sources (ALLOWED ONLY — NO EXCEPTIONS)
1. **User-submitted testimonials** (PRIMARY) — only from users with research consent
2. **Public research papers** — PubMed, VA research publications
3. **VA and CFR documents** — already in RAG knowledge base
4. **Opt-in analytics** — anonymized role → condition frequency data

### PROHIBITED Data Sources
- ❌ Facebook scraping (violates platform ToS)
- ❌ Reddit scraping without API access (use Reddit Data API if available)
- ❌ Any private platform without explicit API authorization
- ❌ Shadow profiles (inferring data about non-consenting users)
- ❌ Any data from users who have NOT consented to research scope

### Insight Model
```typescript
interface ConditionInsight {
  id: string;
  condition: string;              // "Knee Pain", "Hearing Loss", "PTSD"
  relatedRoles: RoleConnection[]; // Which military roles report this
  contributingActivities: string[]; // What service activities contribute
  evidenceSources: EvidenceSource[];
  confidenceScore: number;        // 0.0 - 1.0
  sampleSize: number;             // How many data points (minimum 10 for display)
  generatedAt: Date;
  disclaimer: string;             // ALWAYS present
}

interface RoleConnection {
  branch: Branch;
  roleCode: string;
  roleDisplayName: string;
  frequency: "common" | "moderate" | "rare";
}

interface EvidenceSource {
  type: "community" | "research" | "official";
  reference: string;  // Citation or "Based on X community reports"
  reliability: "high" | "medium" | "low";
}
```

### Insight Generation Pipeline
1. Aggregate anonymized testimonials from consenting users
2. Cluster by role code and reported symptoms/conditions
3. Cross-reference with CFR 38 rating criteria and VA research
4. Generate structured insight with confidence score
5. Pass through Compliance Engine (no medical diagnoses, no guarantees)
6. Admin review before publishing
7. Tag with source reliability badges

### CRITICAL FRAMING RULE
Every insight MUST include this disclaimer:
> "This pattern is based on anonymized community data and public research. It is not medical advice. Consult your healthcare provider and VSO for guidance specific to your situation."

### Minimum Sample Size
- Insights require a minimum of 10 anonymized data points to be generated
- Below 10: data is stored for future pattern detection but NOT displayed
- This prevents identifying individuals from small cohorts

### Example Output
```
Condition: Bilateral Knee Pain
Confidence: 0.78 (Moderate-High)
Sample: 47 veterans

Related Roles:
- Navy BM (Boatswain's Mate) — Common
- Army 11B (Infantryman) — Common
- Marine Corps 0311 (Rifleman) — Common

Contributing Activities:
- Ship ladder climbing (Navy)
- Ruck marching with 60+ lb loads (Army/Marines)
- Prolonged standing watch (all branches)
- Running on hard surfaces (PT requirements)

Evidence:
- 47 community reports (community, medium reliability)
- VA study on musculoskeletal conditions in service members (research, high reliability)
- 38 CFR § 4.71a DC 5260-5261 (official, high reliability)

⚠️ This pattern is based on anonymized community data and public research.
It is not medical advice.
```

---

## REPORT GENERATION & DISTRIBUTION

### Report Types
1. **Monthly Insight Reports** — aggregated condition patterns by branch/role
2. **Benefit Discovery Newsletters** — new or updated benefits, hidden gems
3. **What Changed This Month** — CFR/policy changes in plain English
4. **Community Trend Summaries** — most upvoted strategies, popular topics

### Report Model
```typescript
interface Report {
  id: string;
  title: string;
  type: "insight" | "benefits" | "regulatory" | "community";
  sections: ReportSection[];
  generatedAt: Date;
  version: string;
}

interface ReportSection {
  heading: string;
  content: string;    // Plain-language summary
  citations: string[]; // Source references
}
```

### Distribution
- **In-app notification** — badge on home screen, expandable summary
- **Email digest** — opt-in only, unsubscribe link in every email, CAN-SPAM compliant
- **PDF download** — generated via ReportLab, available in Learning Hub
- **Push notification** (mobile) — opt-in only, brief headline with link to full report

### Email Rules
- ❌ No emails without explicit opt-in
- ✅ Unsubscribe link in every email (one-click, no login required)
- ✅ Clear sender identity: "VetAssist — Your AI Battle Buddy"
- ❌ No spam patterns (max 4 emails per month)
- ✅ Plain-text fallback for all HTML emails

---

## EXTENDED EVENT SYSTEM

Add these events to the existing event-driven architecture:

### Auth Events
- USER_REGISTERED
- USER_LOGGED_IN
- USER_LOGGED_OUT
- USER_EMAIL_VERIFIED
- LOGIN_FAILED (rate limit tracking)

### Profile Events
- PROFILE_CREATED
- PROFILE_UPDATED
- PROFILE_DELETED

### Consent Events
- CONSENT_GRANTED (scope)
- CONSENT_WITHDRAWN (scope)
- CONSENT_VERSION_UPDATED

### Community Events (extending existing)
- TESTIMONIAL_SUBMITTED → PII Scanner → Toxicity Filter → Moderation Queue
- TESTIMONIAL_FLAGGED
- TESTIMONIAL_APPROVED
- TESTIMONIAL_REJECTED
- COMMENT_SUBMITTED
- COMMENT_FLAGGED

### Intelligence Events
- INSIGHT_GENERATION_STARTED
- INSIGHT_GENERATED
- INSIGHT_REVIEWED (admin)
- INSIGHT_PUBLISHED
- INSIGHT_RETIRED (outdated data)

### Report Events
- REPORT_GENERATED
- REPORT_DISTRIBUTED (channel: email | push | in-app)
- NEWSLETTER_SENT (recipient count, no PII)

---

## NEW BACKEND PACKAGES

Add to monorepo:
```
packages/
  auth/               # Authentication, session management, bot protection
  consent/            # Consent engine, scope management, data lifecycle
  community/          # Testimonials, moderation, upvotes, comments
  insights/           # Pattern detection, clustering, insight generation
  reports/            # PDF generation, email digest, newsletter system
```

Each package:
- Has its own package.json with internal dependencies
- Exports typed interfaces from shared-types
- Uses event-driven communication (no direct cross-package function calls)
- Has its own test suite

---

## DATABASE SCHEMA ADDITIONS

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### Veteran Profiles Table
```sql
CREATE TABLE veteran_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch VARCHAR(50),
  role_code VARCHAR(20),
  role_display_name VARCHAR(100),
  years_served VARCHAR(10),
  service_era VARCHAR(50),
  consent_to_research BOOLEAN DEFAULT false,
  consent_to_analytics BOOLEAN DEFAULT false,
  consent_to_community BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Consent Records Table
```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  policy_version VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Testimonials Table
```sql
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  branch VARCHAR(50),
  role_code VARCHAR(20),
  tags TEXT[],
  is_anonymous BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending',
  moderation_notes TEXT,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Condition Insights Table
```sql
CREATE TABLE condition_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition VARCHAR(200) NOT NULL,
  related_roles JSONB NOT NULL,
  contributing_activities TEXT[],
  evidence_sources JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  sample_size INTEGER NOT NULL,
  disclaimer TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ
);
```

### Email Subscriptions Table
```sql
CREATE TABLE email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
```

---

## TESTING REQUIREMENTS FOR NEW SYSTEMS

### Auth Tests
- Registration with valid email succeeds
- Registration with duplicate email fails
- Magic link generation and verification
- Rate limiting blocks after 5 failed attempts
- Bot protection integration

### Consent Tests
- Consent withdrawal triggers data deletion for that scope
- Analytics disabled when consent.analytics is false
- Research exclusion when consent.research is false
- Community read-only when consent.community is false
- Consent version tracking on policy updates

### Insight Tests
- Insight generation requires minimum 10 data points
- Users without research consent are excluded
- Confidence score calculated correctly
- Compliance engine catches medical diagnosis language in insights
- Disclaimer always present in output

### Report Tests
- PDF generation produces valid file
- Email includes unsubscribe link
- No PII in any report content
- Report content matches source citations
