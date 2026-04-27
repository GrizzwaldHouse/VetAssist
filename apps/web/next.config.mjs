// next.config.mjs
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Next.js configuration for VetAssist web app

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@vetassist/ui-components',
    '@vetassist/shared-types',
    '@vetassist/shared-utils',
    '@vetassist/shared-config',
    '@vetassist/claims',
  ],
  experimental: {
    // Required for ES module packages in monorepo
    esmExternals: true,
  },
  webpack(config) {
    // Map .js imports to TypeScript source files — required for ESM packages
    // that use explicit .js extensions in their import statements (Node16 / bundler moduleResolution)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
