// vitest.config.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Vitest config for @vetassist/security — resolves workspace package aliases

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
      // Point to compiled dist — shared-config uses .js re-exports internally that esbuild won't resolve from src
      '@vetassist/shared-config': resolve('../../packages/shared-config/dist/index.js'),
    },
  },
});
