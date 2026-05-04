// vitest.config.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Vitest config for @vetassist/compliance — resolves workspace package aliases

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    alias: {
      '@vetassist/shared-types': resolve('../../packages/shared-types/src/index.ts'),
      '@vetassist/events': resolve('../../packages/events/src/index.ts'),
      '@vetassist/crisis': resolve('../../packages/crisis/src/index.ts'),
      '@vetassist/legal': resolve('../../packages/legal/src/index.ts'),
      '@vetassist/shared-config': resolve('../../packages/shared-config/src/index.ts'),
      '@vetassist/shared-utils': resolve('../../packages/shared-utils/src/index.ts'),
    },
  },
});
