# VetAssist Task 4.4 — Analytics & Grant Reporting BRAINSTORM RESPONSES
Captured: 2026-05-01

---

## SECTION 1 — Analytics Architecture

### Q1: Event storage backend
- [x] PostHog self-hosted (DigitalOcean droplet): Full control, no SaaS dependency, pairs with existing infra
- [ ] PostHog cloud: Easier ops but PII exposure risk and SaaS cost
- [ ] Custom event store (Postgres): Zero third-party but high build cost

### Q2: Consent model
- [x] Opt-in only, per-session, default false: Matches veteran trust posture and GDPR/CCPA baseline
- [ ] Opt-out by default: Higher data volume but erodes trust with privacy-sensitive veteran population

### Q3: PII protection strategy
- [x] Defense-in-depth — key blocklist + value regex at every capture point: Belt-and-suspenders because analytics SDK errors can forward raw props
- [ ] Trust caller to strip PII: Single point of failure, unacceptable for a VA platform

---

## SECTION 2 — Package Design

### Q4: Where does analytics logic live?
- [x] packages/insights — dedicated package: Matches 95/5 rule; apps only render, packages hold logic
- [ ] Inline in apps/api: Violates 95/5 rule, hard to test in isolation

### Q5: PostHog client pattern
- [x] Singleton PostHogAdapter with FeatureFlags.analyticsEnabled guard: One connection, one queue, one shutdown hook
- [ ] Per-request client: Connection overhead and no shared flush queue

### Q6: PDF generation dependency
- [x] No external deps — mirror CertificateGenerator PDF-1.4 pattern: Zero supply-chain risk, proven pattern in repo
- [ ] pdfkit or similar: Easier layout but adds dep and build weight

---

## SECTION 3 — API Routes

### Q7: Admin route protection
- [x] accreditedGuard preHandler on /admin/* routes: Matches advisory.ts pattern, consistent access model
- [ ] Separate admin middleware: Duplication of the existing pattern

### Q8: Public impact endpoint
- [x] GET /analytics/impact — no auth, current-month only: Safe because only anonymous aggregates, no user-level data
- [ ] Require auth: Unnecessary friction for a public trust/growth signal page

---

## SECTION 4 — Web Integration

### Q9: PostHog browser init location
- [x] PostHogProvider 'use client' wrapper in LayoutShell: Runs once, respects Next.js client boundary, no SSR window errors
- [ ] In app/layout.tsx server component: window/localStorage not available server-side

### Q10: Admin dashboard page
- [x] /admin/analytics — inline React.CSSProperties, no Tailwind: Matches existing admin page patterns in this repo
- [ ] Tailwind classes: Inconsistent with the inline style pattern established in prior admin pages

### Q11: Impact page rendering strategy
- [x] Next.js ISR with revalidate=3600: Feels live, no per-request server cost, graceful fallback to '—' on API down
- [ ] Client-side fetch: Flickering metrics on load, worse SEO

---

## SECTION 5 — Mobile

### Q12: Analytics hook pattern
- [x] useAnalytics — fire-and-forget async IIFE, triple gate (consent + offline + sessionId): Matches useNetworkStatus pattern, analytics never blocks UI
- [ ] Synchronous fetch: Would freeze UI on slow connections

### Q13: Session ID storage
- [x] AsyncStorage keyed by ANALYTICS_CONFIG.sessionIdStorageKey: Pseudonymous, persists across app restarts, no userId
- [ ] In-memory only: Lost on app restart, breaks session continuity

---

## SECTION 6 — Compliance & Grant Reporting

### Q14: Grant report format
- [x] PDF-1.4 base64, no external deps: Consistent with deletion certificate pattern, works offline, email-attachable
- [ ] CSV export: Less formal, not suitable for grant submission

### Q15: Aggregate query implementation (Phase 4.4 scope)
- [x] Placeholder zeros — real PostHog REST API query deferred to prod config: Correct for dev/staging where POSTHOG_PROJECT_ID is not yet set
- [ ] Mock data: Misleading in staging environment

---

*Locked 2026-05-01. Implementation complete in Task 4.4.*
