// prisma.config.ts loads the repo-root .env as a side effect of being imported, so each case
// re-imports it. existsSync and process.loadEnvFile are stubbed: no .env is ever opened.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOT_ENV_FILE } from './env-file.js';

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: vi.fn(() => true),
}));

const originalArgv = process.argv;

/** Imports prisma.config.ts afresh under `argv` and reports whether it loaded the .env. */
async function loadsEnvFile(argv: string[]): Promise<boolean> {
  const loadEnvFile = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => undefined);
  process.argv = ['node', 'prisma', ...argv];
  vi.resetModules();
  await import('../../../prisma.config.js');
  if (loadEnvFile.mock.calls.length === 0) return false;
  expect(loadEnvFile).toHaveBeenCalledExactlyOnceWith(ROOT_ENV_FILE);
  return true;
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', undefined);
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('prisma.config.ts env-file fallback', () => {
  it.each(['migrate', 'db', 'studio'])(
    'loads the repo-root .env for `%s` in development with DATABASE_URL unset',
    async (command) => {
      expect(await loadsEnvFile([command, 'status'])).toBe(true);
    },
  );

  it.each(['production', 'test'])('never loads it under NODE_ENV %s', async (nodeEnv) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    expect(await loadsEnvFile(['migrate', 'deploy'])).toBe(false);
  });

  it('never loads it for `prisma generate`', async () => {
    expect(await loadsEnvFile(['generate'])).toBe(false);
  });

  it('never overrides an exported DATABASE_URL', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@127.0.0.1:1/db');
    expect(await loadsEnvFile(['migrate', 'deploy'])).toBe(false);
  });
});
