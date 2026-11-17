// Integration suite: specs in test/integration/ as *.int-spec.ts run against the real services
// from `pnpm services:up` (UL-124 Redis Streams, UL-125 Postgres).
//
//   DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:55432/app \
//   REDIS_URL=redis://127.0.0.1:56379 pnpm --filter @app/api test:integration
//
// `pnpm test` (vitest.config.ts) never picks these files up, so CI, which has no services yet,
// does not run them. Both URLs must be exported: NODE_ENV is test, so nothing reads .env, and a
// missing URL fails the run instead of skipping it, so a misconfigured job cannot pass green.
// UL-132 adds the CI service containers and runs this same config there.
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

function required(name: 'DATABASE_URL' | 'REDIS_URL'): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`test:integration needs ${name} (see apps/api/README.md "Integration tests")`);
  }
  return value;
}

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/integration/**/*.int-spec.ts'],
    // One database and one Redis for every spec: run the files one after another.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: required('DATABASE_URL'),
      REDIS_URL: required('REDIS_URL'),
    },
  },
});
