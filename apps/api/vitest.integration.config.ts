// Integration suite (UL-125): specs in test/integration/ run against a real Postgres.
//
//   pnpm services:up && pnpm db:migrate
//   DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:55432/app pnpm --filter @app/api test:integration
//
// `pnpm test` (vitest.config.ts) never picks these files up, so CI, which has no database yet,
// does not run them. Here DATABASE_URL must be exported: NODE_ENV is test, so nothing reads .env,
// and a missing URL fails the run instead of skipping it, so a misconfigured job cannot pass
// green. UL-132 adds the CI service containers and can run this same config there.
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error(
    'test:integration needs DATABASE_URL (a migrated database, see apps/api/README.md "Tests")',
  );
}

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/integration/**/*.int-spec.ts'],
    // One database for every spec: run the files one after another.
    fileParallelism: false,
    env: { NODE_ENV: 'test', DATABASE_URL: databaseUrl },
  },
});
