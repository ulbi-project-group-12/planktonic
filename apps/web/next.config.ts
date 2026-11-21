import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// The monorepo root: standalone tracing and Turbopack both need to see packages/ and the
// root node_modules, so the server lands at .next/standalone/apps/web/server.js.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
    // Turbopack also resolves client imports for SSR. MSW's browser export is null
    // under the Node condition, so resolve the pinned browser entry explicitly.
    resolveAlias: { 'msw/browser': './node_modules/msw/lib/browser/index.js' },
  },
  // product.ts is TypeScript source in a workspace package.
  transpilePackages: ['@app/config'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
