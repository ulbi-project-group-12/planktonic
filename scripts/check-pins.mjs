// Exact-pin guard (D-07). Run from the repo root: `pnpm check:pins` (CI lint job).
//
// Rule: every version lives in the `catalog:` block of pnpm-workspace.yaml as a bare
// `x.y.z`, and every manifest dependency is either `catalog:` or `workspace:*`.
// `savePrefix: ''` and `catalogMode: strict` only cover `pnpm add`; a hand-edited
// range such as `^1.2.3` in a package.json or the catalog would otherwise slip through.
//
// pnpm also changes what gets installed through overrides, package extensions, patches,
// named catalogs, pnpmfile hooks (including those of `configDependencies`), `include`d
// settings files and build-script or release-age exceptions. So pnpm-workspace.yaml may
// hold only the top-level keys in ALLOWED_KEYS, and any other key fails (fail closed).
// `minimumReleaseAge` must be present and at least 14 days. Overrides (`overrides:` in
// the workspace file, `pnpm.overrides`, `resolutions` or `overrides` in a manifest) are
// allowed only when every value is an exact `x.y.z`, which is the security-bump case.
// Extend this guard in a reviewed PR if another setting is ever needed.
//
// Build scripts (D-06, phase 1.1): pnpm 12 runs a dependency's install scripts only when
// `allowBuilds:` lists it `true`; an unlisted one fails the install with
// ERR_PNPM_IGNORED_BUILDS (`strictDepBuilds` defaults to true). The guard accepts
// `allowBuilds:` only as a block mapping of bare package names to `true` or `false`, so
// every approval or denial is an explicit, reviewed line: no versions, ranges, wildcards,
// URLs or pnpm's auto-written placeholders. `onlyBuiltDependencies` and friends are ignored
// by pnpm 12, so they stay off the allowlist.
//
// The manifests checked are the root package.json plus every package.json matched by
// the `packages:` globs, so a new workspace directory is covered without editing this
// file. `!` exclusions are ignored: checking an excluded package too is merely stricter.
//
// Zero dependencies, so pnpm-workspace.yaml is read by a small line scanner, not a YAML
// parser. It accepts only the plain block style this file uses and reports anything else
// as an error (fail closed). Tests: scripts/check-pins.test.mjs (`pnpm test:root`).
import { existsSync, globSync, readFileSync } from 'node:fs';

const EXACT = /^\d+\.\d+\.\d+$/;
const ALLOWED_SPECS = new Set(['catalog:', 'workspace:*']);
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const WORKSPACE = 'pnpm-workspace.yaml';
// The only top-level keys pnpm-workspace.yaml may hold; everything else fails.
const ALLOWED_KEYS = new Set([
  'packages',
  'catalog',
  'overrides',
  'minimumReleaseAge',
  'engineStrict',
  'savePrefix',
  'catalogMode',
  'updateNotifier',
  'allowBuilds',
]);
// Named for a clearer message; the allowlist would reject them anyway. They change
// resolution, load pnpmfile hooks, waive the release-age rule or allow every build script.
const DENIED_KEYS = new Set([
  'packageExtensions',
  'patchedDependencies',
  'catalogs',
  'pnpmfile',
  'globalPnpmfile',
  'configDependencies',
  'include',
  'minimumReleaseAgeExclude',
  'dangerouslyAllowAllBuilds',
]);
// 14 days, in minutes (D-07).
const MIN_RELEASE_AGE = 20160;
const PNPMFILES = ['.pnpmfile.cjs', '.pnpmfile.mjs'];
// A bare npm package name, optionally scoped; no version, range, wildcard or URL.
const BARE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/** @type {string[]} */
const errors = [];

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return value !== null && typeof value === 'object'
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/** @param {string} value */
function unquote(value) {
  const m = /^'([^']*)'$|^"([^"]*)"$/.exec(value);
  return m ? (m[1] ?? m[2] ?? '') : value;
}

/**
 * Split pnpm-workspace.yaml into its top-level keys. A key at column 0 starts a block.
 * Blank lines and comments, at any indent, never end a block: YAML ignores them, so a
 * column-0 `# note` between catalog entries must not hide the entries after it.
 *
 * @param {string} source
 * @returns {Map<string, { line: number, inline: string, body: { line: number, text: string }[] }>}
 */
function topLevelBlocks(source) {
  /** @type {Map<string, { line: number, inline: string, body: { line: number, text: string }[] }>} */
  const blocks = new Map();
  /** @type {{ line: number, inline: string, body: { line: number, text: string }[] } | undefined} */
  let current;
  source.split(/\r?\n/).forEach((text, index) => {
    const line = index + 1;
    if (/^\s*(#.*)?$/.test(text)) return;
    if (/^\s/.test(text) || text.startsWith('- ')) {
      if (current === undefined) {
        errors.push(`${WORKSPACE}:${String(line)}: content before the first key`);
      } else {
        current.body.push({ line, text });
      }
      return;
    }
    const m = /^([A-Za-z][\w-]*):(?:[ \t]+(.*))?$/.exec(text);
    if (!m) {
      errors.push(`${WORKSPACE}:${String(line)}: unsupported top-level line "${text}"`);
      current = undefined;
      return;
    }
    const [, key = '', rest = ''] = m;
    const inline = rest.startsWith('#') ? '' : rest.replace(/\s+#.*$/, '').trim();
    if (blocks.has(key)) {
      errors.push(`${WORKSPACE}:${String(line)}: duplicate top-level key \`${key}\``);
    }
    current = { line, inline, body: [] };
    blocks.set(key, current);
  });
  return blocks;
}

/**
 * Parse an indented `name: value` line of a flat block mapping; quotes are removed.
 *
 * @param {string} text
 */
function mappingEntry(text) {
  const m =
    /^ +('[^']+'|"[^"]+"|[^\s'"#][^:]*?):[ \t]+('[^']*'|"[^"]*"|[^\s'"#]\S*)(?:[ \t]+#.*)?$/.exec(
      text,
    );
  if (!m) return undefined;
  return { name: unquote(m[1] ?? ''), value: unquote(m[2] ?? '') };
}

const blocks = topLevelBlocks(readFileSync(WORKSPACE, 'utf8'));

/**
 * Overrides may only pin exact versions.
 *
 * @param {string} where
 * @param {string} name
 * @param {unknown} value
 */
function checkOverride(where, name, value) {
  if (typeof value !== 'string' || !EXACT.test(value)) {
    errors.push(
      `${where}: override ${name} = ${JSON.stringify(value)} (only exact x.y.z is allowed)`,
    );
  }
}

for (const [key, block] of blocks) {
  if (DENIED_KEYS.has(key)) {
    errors.push(`${WORKSPACE}:${String(block.line)}: \`${key}:\` is not allowed`);
  } else if (!ALLOWED_KEYS.has(key)) {
    errors.push(
      `${WORKSPACE}:${String(block.line)}: \`${key}:\` is not on the allowlist (extend scripts/check-pins.mjs in a reviewed PR)`,
    );
  }
}
const releaseAge = blocks.get('minimumReleaseAge');
if (
  releaseAge === undefined ||
  releaseAge.body.length > 0 ||
  !/^\d+$/.test(releaseAge.inline) ||
  Number(releaseAge.inline) < MIN_RELEASE_AGE
) {
  errors.push(
    `${WORKSPACE}${releaseAge ? `:${String(releaseAge.line)}` : ''}: minimumReleaseAge must be a plain integer >= ${String(MIN_RELEASE_AGE)} (14 days, in minutes)`,
  );
}
for (const file of PNPMFILES) {
  if (existsSync(file)) errors.push(`${file}: pnpmfile hooks are not allowed`);
}

const overrides = blocks.get('overrides');
if (overrides !== undefined) {
  if (overrides.inline !== '') {
    errors.push(`${WORKSPACE}:${String(overrides.line)}: \`overrides:\` must be a block mapping`);
  }
  for (const { line, text } of overrides.body) {
    const entry = mappingEntry(text);
    if (entry) checkOverride(`${WORKSPACE}:${String(line)}`, entry.name, entry.value);
    else errors.push(`${WORKSPACE}:${String(line)}: unparseable overrides line "${text.trim()}"`);
  }
}

const allowBuilds = blocks.get('allowBuilds');
if (allowBuilds !== undefined) {
  if (allowBuilds.inline !== '') {
    errors.push(
      `${WORKSPACE}:${String(allowBuilds.line)}: \`allowBuilds:\` must be a block mapping`,
    );
  }
  /** @type {Set<string>} */
  const seen = new Set();
  for (const { line, text } of allowBuilds.body) {
    const where = `${WORKSPACE}:${String(line)}`;
    const entry = mappingEntry(text);
    if (!entry) {
      errors.push(`${where}: unparseable allowBuilds line "${text.trim()}"`);
      continue;
    }
    if (!BARE_NAME.test(entry.name)) {
      errors.push(`${where}: allowBuilds ${entry.name} is not a bare package name`);
    }
    if (seen.has(entry.name)) errors.push(`${where}: duplicate allowBuilds entry ${entry.name}`);
    seen.add(entry.name);
    if (entry.value !== 'true' && entry.value !== 'false') {
      errors.push(
        `${where}: allowBuilds ${entry.name} = "${entry.value}" (only true or false is allowed)`,
      );
    }
  }
}

/** @type {string[]} */
const globs = [];
const packages = blocks.get('packages');
if (packages === undefined || packages.inline !== '') {
  errors.push(`${WORKSPACE}: \`packages:\` must be a block list of globs`);
} else {
  for (const { line, text } of packages.body) {
    const m = /^\s*-\s+('[^']*'|"[^"]*"|[^\s'"#]\S*)(?:\s+#.*)?$/.exec(text);
    if (!m) {
      errors.push(`${WORKSPACE}:${String(line)}: unparseable packages line "${text.trim()}"`);
      continue;
    }
    const glob = unquote(m[1] ?? '');
    if (!glob.startsWith('!')) globs.push(glob);
  }
}

const manifests = [
  'package.json',
  ...new Set(
    globs
      .flatMap((glob) => globSync(`${glob.replace(/\/+$/, '')}/package.json`))
      .filter((file) => !/(^|\/)node_modules\//.test(file)),
  ),
].sort((a, b) => (a === 'package.json' ? -1 : b === 'package.json' ? 1 : a.localeCompare(b)));
for (const file of manifests) {
  /** @type {Record<string, unknown>} */
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of FIELDS) {
    for (const [name, spec] of Object.entries(asRecord(pkg[field]))) {
      if (typeof spec !== 'string' || !ALLOWED_SPECS.has(spec)) {
        errors.push(`${file}: ${field}.${name} = ${JSON.stringify(spec)}`);
      }
    }
  }
  const pnpm = asRecord(pkg.pnpm);
  for (const key of ['packageExtensions', 'patchedDependencies']) {
    if (key in pnpm) errors.push(`${file}: pnpm.${key} is not allowed`);
  }
  for (const [label, map] of [
    ['pnpm.overrides', pnpm.overrides],
    ['resolutions', pkg.resolutions],
    ['overrides', pkg.overrides],
  ]) {
    if (map === undefined) continue;
    for (const [name, value] of Object.entries(asRecord(map))) {
      checkOverride(`${file}: ${String(label)}`, name, value);
    }
  }
}

const catalog = blocks.get('catalog');
/** @type {Set<string>} */
const catalogNames = new Set();
if (catalog === undefined) {
  errors.push(`${WORKSPACE}: no top-level \`catalog:\` block found`);
} else if (catalog.inline !== '') {
  errors.push(
    `${WORKSPACE}:${String(catalog.line)}: \`catalog:\` must be a block mapping, one entry per line`,
  );
} else {
  for (const { line, text } of catalog.body) {
    const entry = mappingEntry(text);
    if (!entry) {
      errors.push(`${WORKSPACE}:${String(line)}: unparseable catalog line "${text.trim()}"`);
      continue;
    }
    if (catalogNames.has(entry.name)) {
      errors.push(`${WORKSPACE}:${String(line)}: duplicate catalog entry ${entry.name}`);
    }
    catalogNames.add(entry.name);
    if (!EXACT.test(entry.value)) {
      errors.push(`${WORKSPACE}:${String(line)}: catalog ${entry.name} = "${entry.value}"`);
    }
  }
  if (catalogNames.size === 0) errors.push(`${WORKSPACE}: catalog is empty`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`check-pins: ${String(catalogNames.size)} catalog entries OK`);
console.log(`check-pins: ${String(manifests.length)} manifests OK`);
