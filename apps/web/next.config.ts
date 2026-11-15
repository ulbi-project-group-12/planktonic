import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Корень монорепы: standalone-трейсинг и Turbopack должны видеть packages/ и корневой
// node_modules, поэтому сервер собирается в .next/standalone/apps/web/server.js.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // product.ts — TypeScript-исходник в workspace-пакете.
  transpilePackages: ['@app/config'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
