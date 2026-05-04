// vitest.config.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Vitest configuration for monorepo — covers all packages and root tests

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: [
      'tests/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    alias: {
      '@vetassist/shared-types': resolve('./packages/shared-types/src/index.ts'),
      '@vetassist/shared-utils': resolve('./packages/shared-utils/src/index.ts'),
      '@vetassist/shared-config': resolve('./packages/shared-config/src/index.ts'),
      '@vetassist/events': resolve('./packages/events/src/index.ts'),
      '@vetassist/pii': resolve('./packages/pii/src/index.ts'),
      '@vetassist/crisis': resolve('./packages/crisis/src/index.ts'),
      '@vetassist/legal': resolve('./packages/legal/src/index.ts'),
      '@vetassist/compliance': resolve('./packages/compliance/src/index.ts'),
      '@vetassist/ai': resolve('./packages/ai/src/index.ts'),
      '@vetassist/security': resolve('./packages/security/src/index.ts'),
      '@vetassist/benefits': resolve('./packages/benefits/src/index.ts'),
      '@vetassist/community': resolve('./packages/community/src/index.ts'),
      '@vetassist/moderation': resolve('./packages/moderation/src/index.ts'),
      '@vetassist/claims': resolve('./packages/claims/src/index.ts'),
      '@vetassist/auth': resolve('./packages/auth/src/index.ts'),
      '@vetassist/consent': resolve('./packages/consent/src/index.ts'),
    },
  },
});
