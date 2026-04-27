# Environment Configuration Guide
# Developer: Marcus Daley
# Date: 2026-04-12
# Purpose: Explains every environment variable, where to get the values, and security requirements

---

## Setup Instructions

1. Copy the template: `cp environment/.env.example .env`
2. Fill in each value following the guide below
3. NEVER commit `.env` to git — only `.env.example` (with placeholder values) goes in version control
4. For production, use a secrets manager (Railway secrets, Vercel env vars, or AWS Secrets Manager)

## Variable Reference

### Application Settings
| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| APP_ENV | Yes | `development`, `staging`, or `production` | Set based on deployment |
| APP_PORT | Yes | Web app port (default: 3000) | Choose any available port |
| API_PORT | Yes | API server port (default: 3001) | Choose any available port |

### Anthropic Claude API
| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| CLAUDE_API_KEY | Yes | Anthropic API key | https://console.anthropic.com → API Keys |
| CLAUDE_MODEL_PRIMARY | Yes | Model for complex reasoning | Default: claude-sonnet-4-6 |
| CLAUDE_MODEL_FAST | Yes | Model for classification tasks | Default: claude-haiku-4-5-20251001 |

### Hugging Face
| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| HF_API_TOKEN | For server-side PII/moderation | HF access token | https://huggingface.co/settings/tokens |

### Auth0
| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| AUTH0_DOMAIN | Yes | Your Auth0 tenant domain | https://manage.auth0.com → Applications |
| AUTH0_CLIENT_ID | Yes | Application client ID | Same Auth0 dashboard |
| AUTH0_CLIENT_SECRET | Yes (API only) | Application client secret | Same Auth0 dashboard |

### File Storage Security
| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| TEMP_STORAGE_ENCRYPTION_KEY | Yes | AES-256 key for file encryption | Generate: `openssl rand -hex 32` |
| TEMP_STORAGE_DEFAULT_TTL_HOURS | Yes | Hours before auto-purge | Default: 24 |
| TEMP_STORAGE_MAX_TTL_DAYS | Yes | Maximum days for save-for-later | Default: 30 (non-configurable max) |

### Compliance Settings
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| AI_DISCLOSURE_ENABLED | Yes | Show AI disclosure banners | true (NEVER set to false in production) |
| SCORING_DEFAULT_MODE | Yes | Default document scoring mode | "encouraging" |
| MODERATION_MODE | Yes | Content moderation strategy | "hybrid" |
| MODERATION_LOCKDOWN | Yes | Manual approval for all posts | false (admin can toggle to true) |
| PAYWALL_ENABLED | Yes | Enable/disable premium tier | false (free for all veterans) |

## Security Requirements

- ALL API keys must be stored in environment variables, NEVER in source code
- Rotate CLAUDE_API_KEY and HF_API_TOKEN quarterly
- TEMP_STORAGE_ENCRYPTION_KEY must be unique per environment
- Production must use TLS 1.3 minimum (enforced at hosting layer)
- PII_DETECTION_ENABLED must NEVER be set to false in production
