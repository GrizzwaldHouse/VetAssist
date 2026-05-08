// vitest.config.ts
// Developer: Marcus Daley
// Date: 2026-05-08
// Purpose: Vitest config for @vetassist/crisis — picks up __tests__ directory

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    // Allow importing .ts files via .js extension (ESM convention in TypeScript)
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    alias: {
      '@vetassist/shared-types': resolve('../shared-types/src/index.ts'),
      '@vetassist/shared-config': resolve('../shared-config/src/index.ts'),
      '@vetassist/events': resolve('../events/src/index.ts'),
    },
  },
});
