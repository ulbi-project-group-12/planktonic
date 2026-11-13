// The one env file the api and the Prisma CLI may read, and when (D-13).
//
// - The path comes from this module's location, never from the current directory: src/core/config
//   and dist/core/config both sit five levels below the repo root, so an IDE launch, a debugger or
//   `node apps/api/dist/main.js` from the root all find the same file.
// - Only the repo-root .env, never a per-package one, so the api and `pnpm db:migrate` always
//   agree on the database.
// - Development only: under NODE_ENV test or production nothing reads an env file, only the
//   exported environment, so a test or a server never picks up a developer's .env.
import { fileURLToPath } from 'node:url';

/** Absolute path of the repo-root `.env` (it may not exist). */
export const ROOT_ENV_FILE = fileURLToPath(new URL('../../../../../.env', import.meta.url));

/** Whether an env file may be read here: never under NODE_ENV test or production. */
export function mayReadEnvFile(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test';
}
