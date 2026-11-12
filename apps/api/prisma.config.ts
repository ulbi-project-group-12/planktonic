// Prisma CLI config (D-14): schema, migrations and the datasource URL.
//
// The URL comes from process.env.DATABASE_URL. Prisma's env() helper is not used: it throws when
// the variable is unset, and `prisma generate` (Turbo, CI, `pnpm check:all`) runs without a
// database or a URL.
//
// Dev convenience: database commands (`migrate`, `db`, `studio`) run with DATABASE_URL unset
// load the repo-root .env if it exists. Both conditions matter: `prisma generate` never reads a
// developer's .env, and an exported DATABASE_URL is never overwritten.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const DATABASE_COMMANDS = new Set(['migrate', 'db', 'studio']);
const rootEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));

if (
  process.env.DATABASE_URL === undefined &&
  process.argv.some((arg) => DATABASE_COMMANDS.has(arg)) &&
  existsSync(rootEnvFile)
) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
