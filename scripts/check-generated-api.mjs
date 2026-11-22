import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = join(root, 'apps/web/src/shared/api');
const scratch = join(root, 'apps/web/dist');
mkdirSync(scratch, { recursive: true });
const checkDir = mkdtempSync(join(scratch, 'api-check-'));

/** @param {string} directory */
function files(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)));
}

try {
  // Keep the mutator next to the output so its generated import stays relative.
  copyFileSync(join(api, 'http-client.ts'), join(checkDir, 'http-client.ts'));
  execFileSync('pnpm', ['openapi:export', join(checkDir, 'openapi.json')], {
    cwd: root,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['--filter', '@app/web', 'exec', 'orval', '--config', 'orval.config.ts'], {
    cwd: root,
    env: { ...process.env, ORVAL_CHECK_DIR: checkDir },
    stdio: 'inherit',
  });

  const current = join(api, 'generated');
  const expected = join(checkDir, 'generated');
  const currentFiles = new Set(files(current));
  const expectedFiles = new Set(files(expected));
  const changes = [...new Set([...currentFiles, ...expectedFiles])]
    .sort()
    .filter(
      (file) =>
        !currentFiles.has(file) ||
        !expectedFiles.has(file) ||
        !readFileSync(join(current, file)).equals(readFileSync(join(expected, file))),
    );
  // The checked-in browser worker must be the one the installed MSW ships.
  const worker = 'apps/web/public/mockServiceWorker.js';
  const installed = 'apps/web/node_modules/msw/lib/mockServiceWorker.js';
  if (!readFileSync(join(root, worker)).equals(readFileSync(join(root, installed)))) {
    console.error(`${worker} differs from the installed MSW. Refresh it (apps/web/README.md).`);
    process.exitCode = 1;
  }
  if (changes.length > 0) {
    console.error('Generated API drift. Run pnpm gen:api and review these paths:');
    for (const file of changes) console.error(file);
    process.exitCode = 1;
  } else {
    console.log(`Generated API matches OpenAPI (${String(expectedFiles.size)} files).`);
  }
} finally {
  rmSync(checkDir, { recursive: true, force: true });
}
