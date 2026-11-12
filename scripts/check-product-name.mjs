// Product-name guard (D-35). Run from anywhere: `pnpm check:name` (CI job `name-guard`).
//
// Rule: the product name lives in packages/config/product.ts only. Every other tracked
// file must import it from `@app/config/product` or read PRODUCT_NAME / PRODUCT_SLUG,
// so a rename is a one-file change (D-33, D-36). The terms come from that file, so the
// guard follows a rename without edits. Matching is case-insensitive.
//
// Both tracked paths and contents are checked. Contents are read as UTF-8, line by line;
// a file with a UTF-16 BOM is read line by line as UTF-16. Any file that contains a NUL
// byte is also checked as a whole in every view: UTF-8, Latin-1 and UTF-16 in both byte
// orders at even and odd offsets, so one NUL byte or one padding byte hides nothing. A
// real binary that must embed the name (font, image metadata) goes into ALLOWED_FILES.
//
// `--expect-image-prefix <name>` (CI passes `vars.PRODUCT_SLUG || repository name`, the
// same value release.yml builds image names from) also requires PRODUCT_IMAGE_PREFIX to
// equal it, case-insensitively, so the single source and the real image names agree.
//
// Exit codes: 0 clean, 1 literal found (each hit on stderr as path:line) or the image
// prefix does not match, 2 the single source is missing or invalid, or git cannot list
// files (fail closed, never pass).
// Zero dependencies: `node:` built-ins only.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const SOURCE = 'packages/config/product.ts';
const SLUG = /^[a-z0-9-]+$/;
const MIN_TERM = 3;
// Exact paths only: a nested docs/README.md is NOT exempt. CONTRIBUTING.md is
// deliberately absent and must say "this project" instead.
const ALLOWED_FILES = new Set([SOURCE, 'README.md', '.claude/CLAUDE.md', 'pnpm-lock.yaml']);
const ALLOWED_PREFIXES = ['.planning/'];

/** @param {string} message */
function failClosed(message) {
  console.error(`check-product-name: ${message}`);
  process.exit(2);
}

/** @type {string} */
let root;
/** @type {string | undefined} */
let expectedPrefix;
try {
  const { values } = parseArgs({
    options: { root: { type: 'string' }, 'expect-image-prefix': { type: 'string' } },
  });
  root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  expectedPrefix = values['expect-image-prefix'];
} catch (error) {
  failClosed(error instanceof Error ? error.message : String(error));
}

/** @type {Record<string, unknown>} */
let source = {};
try {
  source = await import(pathToFileURL(join(root, SOURCE)).href);
} catch (error) {
  failClosed(`cannot load ${SOURCE}: ${error instanceof Error ? error.message : String(error)}`);
}
for (const name of ['PRODUCT_DISPLAY_NAME', 'PRODUCT_SLUG', 'PRODUCT_IMAGE_PREFIX']) {
  if (typeof source[name] !== 'string' || source[name] === '') {
    failClosed(`${SOURCE} must export a non-empty string ${name}`);
  }
}
const displayName = String(source.PRODUCT_DISPLAY_NAME);
const slug = String(source.PRODUCT_SLUG);
if (!SLUG.test(slug)) {
  failClosed(`${SOURCE}: PRODUCT_SLUG must be lowercase letters, digits and hyphens`);
}
const imagePrefix = String(source.PRODUCT_IMAGE_PREFIX);
if (!SLUG.test(imagePrefix)) {
  failClosed(
    `${SOURCE}: PRODUCT_IMAGE_PREFIX must be lowercase letters, digits and hyphens (no registry or owner)`,
  );
}
if (expectedPrefix !== undefined) {
  if (expectedPrefix.trim() === '') failClosed('--expect-image-prefix must not be empty');
  if (expectedPrefix.trim().toLowerCase() !== imagePrefix) {
    console.error(
      `check-product-name: ${SOURCE}: PRODUCT_IMAGE_PREFIX "${imagePrefix}" does not match the image name release.yml uses ("${expectedPrefix.trim().toLowerCase()}", from vars.PRODUCT_SLUG or the repository name). Update one of them.`,
    );
    process.exit(1);
  }
}
const terms = [...new Set([displayName.toLowerCase(), slug.toLowerCase()])];
if (terms.some((term) => term.trim().length < MIN_TERM)) {
  failClosed(`${SOURCE}: product name terms must be at least ${String(MIN_TERM)} characters`);
}

/** @type {string[]} */
let files = [];
try {
  files = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);
} catch (error) {
  failClosed(`git ls-files failed: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Text views of a file's bytes. `lines` is scanned line by line: UTF-8, or UTF-16 when
 * the file starts with a BOM, and empty for any other file with a NUL byte. `whole` is
 * set for every file with a NUL byte and joins all views of it: UTF-8, Latin-1 (one char
 * per byte, so an ASCII name is found whatever bytes surround it) and UTF-16LE/BE decoded
 * from offset 0 and offset 1.
 *
 * @param {Buffer} bytes
 * @returns {{ lines: string, whole: string, binary: boolean }}
 */
function decode(bytes) {
  if (!bytes.includes(0)) return { lines: bytes.toString('utf8'), whole: '', binary: false };
  const whole = [bytes.toString('utf8'), bytes.toString('latin1')]
    .concat(
      [bytes, bytes.subarray(1)].flatMap((view) => [
        new TextDecoder('utf-16le').decode(view),
        new TextDecoder('utf-16be').decode(view),
      ]),
    )
    .join('\n');
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { lines: new TextDecoder('utf-16le').decode(bytes), whole, binary: false };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { lines: new TextDecoder('utf-16be').decode(bytes), whole, binary: false };
  }
  return { lines: '', whole, binary: true };
}

/** @type {string[]} */
const hits = [];
let scanned = 0;
let binary = 0;
for (const file of files) {
  if (ALLOWED_FILES.has(file) || ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix))) {
    continue;
  }
  // A directory or file name blocks a rename just like content does (D-33, D-36).
  if (terms.some((term) => file.toLowerCase().includes(term))) {
    hits.push(`${file}: product name in a path, rename it`);
  }
  /** @type {Buffer} */
  let bytes;
  try {
    bytes = readFileSync(join(root, file));
  } catch {
    // Tracked but absent from the working tree (deleted, unstaged) or a gitlink directory.
    continue;
  }
  scanned += 1;
  const { lines, whole, binary: isBinary } = decode(bytes);
  if (isBinary) binary += 1;
  const before = hits.length;
  for (const [index, line] of lines.toLowerCase().split('\n').entries()) {
    if (terms.some((term) => line.includes(term))) {
      hits.push(
        `${file}:${String(index + 1)}: product name literal, import it from @app/config/product or read PRODUCT_NAME`,
      );
    }
  }
  const lineHits = hits.length - before;
  if (lineHits === 0 && terms.some((term) => whole.toLowerCase().includes(term))) {
    hits.push(
      `${file}: product name literal in a file with NUL bytes (UTF-8, Latin-1 or UTF-16 view); a real binary that must embed it goes into ALLOWED_FILES`,
    );
  }
}

if (hits.length > 0) {
  console.error(hits.join('\n'));
  console.error(`check-product-name: ${String(hits.length)} product name literal(s) found`);
  process.exit(1);
}
if (binary > 0) {
  // Say so, so the count below is not read as proof that they were checked line by line.
  console.log(
    `check-product-name: ${String(binary)} binary file(s) checked as a whole (UTF-8, Latin-1, UTF-16 at both offsets), not line by line`,
  );
}
console.log(`check-product-name: ${String(scanned)} tracked files clean`);
