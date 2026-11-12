// @ts-check
// nest(): the NestJS (ESM) preset. On top of base() it enforces the STACK §3.1 layering:
// *.controller / *.gateway-handlers / *.gateway files are adapters and call services; *.service
// owns the rules; *.repository (plus src/core/prisma) is the only Prisma access. Any module
// extension (.ts, .mts, .cts, .js, .mjs, .cjs) counts.
// Core rules only, keyed on those file names. Conventions: packages/config/README.md.
import { globalIgnores } from 'eslint/config';
import { CODE_FILES, coreBlocks, finalize, TEST_FILES } from './base.js';

const EXT = '{ts,mts,cts,js,mjs,cjs}';
// All package code, not only src/: scripts/*.ts must not reach Prisma either.
const PACKAGE_CODE = `**/*.${EXT}`;
const ADAPTERS = ['controller', 'gateway-handlers', 'gateway'].map(
  (kind) => `src/**/*.${kind}.${EXT}`,
);
const PRISMA_OWNERS = [`src/**/*.repository.${EXT}`, 'src/core/prisma/**'];
// Files the Prisma CLI runs: prisma/ (seeds) and prisma.config.ts.
const PRISMA_TOOLING = ['prisma/**', `prisma.config.${EXT}`];

// Import paths: the Prisma packages and Prisma 7 generated output, PrismaService, the core
// prisma module, any repository.
const PRISMA_CLIENT = '^@prisma/|^\\.prisma/|(^|/)generated/prisma(/|$)';
const PRISMA_SERVICE = '(^|/)prisma\\.service(\\.[cm]?[jt]s)?$';
const CORE_PRISMA = '(^|/)core/prisma(/|$)';
const REPOSITORY = '(^|/)[^/]+\\.repository(\\.[cm]?[jt]s)?$';
// This app's own modules: relative, `#` subpath imports, `@/`, `~/` or `src/` aliases.
const LOCAL = '^(\\.|#|~/|@/|src/)';
const TEST_CODE = '(^|/)(test|tests|__tests__)/|\\.(test|spec|e2e-spec)(\\.[cm]?[jt]sx?)?$';

// Imported names, matched from any module (barrels and aliases included).
const PRISMA_NAMES = '^Prisma(Service|Client)$';

const OWNER_MESSAGE =
  'Only *.repository.ts and src/core/prisma may use Prisma (STACK §3.1). Call a repository; `import type` of Prisma models is fine.';
const ADAPTER_MESSAGE =
  'Controllers and gateways are adapters (STACK §3.1): call a service, never Prisma or a repository.';
const RAW_SQL_MESSAGE = 'Raw SQL belongs in *.repository.ts (STACK §3.1).';
const LOCAL_MESSAGE =
  'Adapters take named imports from local modules, not `import * as` or import(), so nest() can check them (STACK §3.1).';
const TEST_IMPORT = {
  regex: TEST_CODE,
  message: 'Production code must not import test files or test helpers.',
};
const ALIAS_MESSAGE =
  'Export PrismaService / PrismaClient under their own name, so nest() can see them (STACK §3.1).';

/** @param {string} pattern @param {string} message */
const importedNames = (pattern, message) => [
  { selector: `ImportSpecifier[imported.name=/${pattern}/]`, message },
  {
    selector: `ExportNamedDeclaration[source] > ExportSpecifier[local.name=/${pattern}/]`,
    message,
  },
];
// Value imports and re-exports only: outside adapters, Prisma types are allowed.
/** @param {string} pattern @param {string} message */
const valueNames = (pattern, message) => [
  {
    selector: `ImportDeclaration[importKind!='type'] > ImportSpecifier[importKind!='type'][imported.name=/${pattern}/]`,
    message,
  },
  {
    selector: `ExportNamedDeclaration[exportKind!='type'][source] > ExportSpecifier[exportKind!='type'][local.name=/${pattern}/]`,
    message,
  },
];
const RAW_SQL = {
  selector: 'MemberExpression[property.name=/^\\$(queryRaw|executeRaw)/]',
  message: RAW_SQL_MESSAGE,
};

/** @param {string} pattern A regex source, as an esquery regex literal. */
const re = (pattern) => `/${pattern.replaceAll('/', '\\/')}/`;

/**
 * Handles no-restricted-imports cannot see: `import()` and `import('…')` types of a banned
 * path, and PrismaService / PrismaClient reached through any namespace.
 *
 * @param {string} paths @param {string} message
 */
const hiddenImports = (paths, message) => [
  { selector: `:matches(ImportExpression, TSImportType)[source.value=${re(paths)}]`, message },
  { selector: `MemberExpression[property.name=${re(PRISMA_NAMES)}]`, message },
  { selector: `TSQualifiedName[right.name=${re(PRISMA_NAMES)}]`, message },
];
const ANY_PRISMA = [PRISMA_CLIENT, PRISMA_SERVICE, CORE_PRISMA].join('|');

/**
 * ESLint replaces a rule's options wholesale, so an app that sets no-restricted-imports or
 * no-restricted-syntax itself turns the layering off. Extra import bans go through
 * `restrictedImports` (no-restricted-imports `patterns` entries), merged into every block.
 *
 * @param {{ tsconfigRootDir: string, restrictedImports?: { regex?: string, group?: string[], message?: string }[] }} opts
 */
export function nest({ tsconfigRootDir, restrictedImports = [] }) {
  /** @param {...object} patterns @returns {import('eslint').Linter.RuleEntry} */
  const imports = (...patterns) => ['error', { patterns: [...patterns, ...restrictedImports] }];
  return finalize(
    ...coreBlocks({ tsconfigRootDir }),
    globalIgnores(['**/generated/prisma/**']),
    {
      files: ['**/*.{ts,mts,cts}'],
      rules: { '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }] },
    },
    restrictedImports.length
      ? { files: [CODE_FILES], rules: { 'no-restricted-imports': imports() } }
      : [],
    {
      files: [PACKAGE_CODE],
      ignores: TEST_FILES,
      rules: { 'no-restricted-imports': imports(TEST_IMPORT) },
    },
    {
      files: [PACKAGE_CODE],
      ignores: [...PRISMA_OWNERS, ...PRISMA_TOOLING, ...TEST_FILES],
      rules: {
        'no-restricted-imports': imports(TEST_IMPORT),
        // Type-only imports never reach the database, so services and DTOs may name Prisma
        // models. Adapters below stay strict: they speak @app/contracts types.
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [PRISMA_CLIENT, PRISMA_SERVICE].map((regex) => ({
              regex,
              message: OWNER_MESSAGE,
              allowTypeImports: true,
            })),
          },
        ],
        'no-restricted-syntax': [
          'error',
          RAW_SQL,
          ...valueNames(PRISMA_NAMES, OWNER_MESSAGE),
          { selector: `ImportExpression[source.value=${re(ANY_PRISMA)}]`, message: OWNER_MESSAGE },
          {
            selector: `MemberExpression[property.name=${re(PRISMA_NAMES)}]`,
            message: OWNER_MESSAGE,
          },
          // Named imports from src/core/prisma (a module, a health indicator) stay legal.
          ...[
            `ImportDeclaration[source.value=${re(CORE_PRISMA)}] > ImportNamespaceSpecifier`,
            `ExportAllDeclaration[source.value=${re(CORE_PRISMA)}]`,
          ].map((selector) => ({ selector, message: OWNER_MESSAGE })),
        ],
      },
    },
    {
      files: ADAPTERS,
      ignores: TEST_FILES,
      rules: {
        // The core rule below already bans these paths here, type-only imports included.
        '@typescript-eslint/no-restricted-imports': 'off',
        'no-restricted-imports': imports(
          ...[PRISMA_CLIENT, PRISMA_SERVICE, CORE_PRISMA, REPOSITORY].map((regex) => ({
            regex,
            message: ADAPTER_MESSAGE,
          })),
          TEST_IMPORT,
        ),
        'no-restricted-syntax': [
          'error',
          RAW_SQL,
          ...importedNames(PRISMA_NAMES, ADAPTER_MESSAGE),
          // A repository reached through a local barrel. Injection needs a value import, so
          // types (GitHubRepository from @app/contracts or a local *.types.ts) stay legal.
          ...[
            `ImportDeclaration[importKind='value'][source.value=${re(LOCAL)}] > ImportSpecifier[importKind='value'][imported.name=/Repository$/]`,
            `ExportNamedDeclaration[exportKind='value'][source.value=${re(LOCAL)}] > ExportSpecifier[exportKind='value'][local.name=/Repository$/]`,
          ].map((selector) => ({ selector, message: ADAPTER_MESSAGE })),
          ...hiddenImports(`${ANY_PRISMA}|${REPOSITORY}`, ADAPTER_MESSAGE),
          // A namespace hides which names an adapter uses: `m.MessagesRepository` via a barrel.
          {
            selector: `:matches(ImportDeclaration[source.value=${re(LOCAL)}] > ImportNamespaceSpecifier, ImportExpression[source.value=${re(LOCAL)}])`,
            message: LOCAL_MESSAGE,
          },
        ],
      },
    },
    {
      files: PRISMA_OWNERS,
      ignores: TEST_FILES,
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: `ExportSpecifier[local.name=${re(PRISMA_NAMES)}]:not([exported.name=${re(PRISMA_NAMES)}])`,
            message: ALIAS_MESSAGE,
          },
        ],
      },
    },
  );
}
