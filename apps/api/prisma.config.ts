// Prisma CLI config (D-14): schema, migrations and the datasource URL.
//
// The URL comes from process.env.DATABASE_URL. Prisma's env() helper is not used: it throws when
// the variable is unset, and `prisma generate` (Turbo, CI, `pnpm check:all`) runs without a
// database or a URL.
//
// Dev convenience: database commands (`migrate`, `db`, `studio`) run with DATABASE_URL unset
// load the repo-root .env if it exists, under the api's rule (src/core/config/env-file.ts):
// never under NODE_ENV test or production, so `NODE_ENV=production pnpm db:migrate` cannot pick
// up a developer's or a server's .env. `prisma generate` never reads it, and an exported
// DATABASE_URL is never overwritten.
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
import { mayReadEnvFile, ROOT_ENV_FILE } from './src/core/config/env-file.js';

const DATABASE_COMMANDS = new Set(['migrate', 'db', 'studio']);

if (
  mayReadEnvFile() &&
  process.env.DATABASE_URL === undefined &&
  process.argv.some((arg) => DATABASE_COMMANDS.has(arg)) &&
  existsSync(ROOT_ENV_FILE)
) {
  process.loadEnvFile(ROOT_ENV_FILE);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
