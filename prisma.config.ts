// prisma.config.ts
// Developer: Marcus Daley
// Date: 2026-05-08
// Purpose: Prisma 7 configuration — database connection URL for migrate and client

import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
