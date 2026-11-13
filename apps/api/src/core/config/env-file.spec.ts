import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mayReadEnvFile, ROOT_ENV_FILE } from './env-file.js';

describe('ROOT_ENV_FILE', () => {
  it('is the .env next to the workspace root, whatever the current directory', () => {
    // Only the path is checked; the .env itself is never opened.
    expect(basename(ROOT_ENV_FILE)).toBe('.env');
    expect(existsSync(join(dirname(ROOT_ENV_FILE), 'pnpm-workspace.yaml'))).toBe(true);
  });
});

describe('mayReadEnvFile', () => {
  it('allows an env file when NODE_ENV is unset', () => {
    expect(mayReadEnvFile({})).toBe(true);
  });

  it.each(['', 'development'])('allows an env file under NODE_ENV %j', (NODE_ENV) => {
    expect(mayReadEnvFile({ NODE_ENV })).toBe(true);
  });

  it.each(['test', 'production'])('forbids an env file under NODE_ENV %s', (NODE_ENV) => {
    expect(mayReadEnvFile({ NODE_ENV })).toBe(false);
  });
});
