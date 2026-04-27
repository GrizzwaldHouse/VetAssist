# Developer Onboarding
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Quick-start guide for developers joining the VetAssist project

---

## First-Time Setup (15 minutes)

### 1. Prerequisites
- Node.js 20+ (required)
- PostgreSQL 15+ (local or Docker)
- Git with SSH key configured

### 2. Clone and Install
```bash
git clone https://github.com/your-org/vetassist.git
cd vetassist
npm install
```

### 3. Environment Setup
```bash
cp environment/.env.example .env
# Edit .env — at minimum set:
# DATABASE_URL (your local PostgreSQL)
# CLAUDE_API_KEY (get from console.anthropic.com)
```

### 4. Database Setup
```bash
npx prisma migrate dev    # Run migrations
npx prisma db seed        # Seed initial data (benefits, FAQ, glossary)
```

### 5. Start Development
```bash
npx turbo dev             # Starts web (3000), API (3001), and all watchers
```

### 6. Install Dev Tools (Recommended for Claude Code users)
```bash
cargo install lean-ctx && lean-ctx init --global   # Token optimization
npm install -g @iyadhk/clauditor && clauditor install  # Session management
```

## Project Orientation

### Read These First
1. `claude/CLAUDE.md` — Master project instructions and all configuration decisions
2. `docs/architecture.md` — System architecture diagram and data flow
3. `docs/security_compliance.md` — Security policies and regulatory requirements

### Key Coding Rules
- Event-driven only (NO polling)
- Single-line comments only (//, never /* */)
- Comments explain WHY, not WHAT
- File headers on every file (filename, developer, date, purpose)
- Zero hardcoded values — everything from config/env
- PII scrubber on EVERY text input — no exceptions
- Crisis line banner on EVERY screen — non-dismissable

### Before You Submit a PR
- [ ] `npx turbo build` passes
- [ ] `npx turbo test` passes (including PII and compliance tests)
- [ ] No hardcoded values (grep for API keys, URLs, magic numbers)
- [ ] All new files have proper headers
- [ ] Accessibility: new components have ARIA labels and keyboard navigation
- [ ] New AI responses pass through Compliance Engine

## Key Contacts
- Project Lead: Marcus Daley
- VA Regulations Questions: Reference claude/skills/va_expert.md
- Security Questions: Reference docs/security_compliance.md
