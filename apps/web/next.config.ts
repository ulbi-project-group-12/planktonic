import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// The monorepo root: standalone tracing and Turbopack both need to see packages/ and the
// root node_modules, so the server lands at .next/standalone/apps/web/server.js.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // product.ts is TypeScript source in a workspace package.
  transpilePackages: ['@app/config'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
