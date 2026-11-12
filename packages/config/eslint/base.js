// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Every module extension: a file no `files` glob matches is skipped without a trace.
const EXT = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
export const CODE_FILES = `**/*.${EXT}`;
export const JS_FILES = '**/*.{js,jsx,mjs,cjs}';

export const TEST_FILES = [
  `**/*.{test,spec,e2e-spec}.${EXT}`,
  `**/{test,tests,__tests__}/**/*.${EXT}`,
];

/**
 * The blocks every preset starts from: ignores, typed TS rules, JS without type info.
 *
 * @param {{ tsconfigRootDir: string }} opts
 * @returns {Parameters<typeof defineConfig>}
 */
export function coreBlocks({ tsconfigRootDir }) {
  return [
    globalIgnores(['dist/**', 'coverage/**', '.turbo/**']),
    {
      linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' },
    },
    {
      files: [CODE_FILES],
      extends: [
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
    },
    { files: [JS_FILES], extends: [tseslint.configs.disableTypeChecked] },
    {
      files: TEST_FILES,
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/unbound-method': 'off',
        'no-restricted-properties': [
          'error',
          ...['describe', 'it', 'test', 'suite'].map((object) => ({
            object,
            property: 'only',
            message: 'Remove .only before committing: it skips every other test.',
          })),
        ],
      },
    },
  ];
}

/**
 * Raises every warn-level rule to error, keeping its options, so the editor shows what CI
 * fails on. Returns copies: the incoming objects include shared plugin configs.
 *
 * @param {import('eslint/config').ConfigObject[]} configs
 * @returns {import('eslint/config').ConfigObject[]}
 */
export function errorsOnly(configs) {
  return configs.map((config) => {
    if (!config.rules) return config;
    /** @type {NonNullable<import('eslint/config').ConfigObject['rules']>} */
    const rules = {};
    for (const [id, entry] of Object.entries(config.rules)) {
      const severity = Array.isArray(entry) ? entry[0] : entry;
      const isWarn = severity === 'warn' || severity === 1;
      rules[id] = !isWarn ? entry : Array.isArray(entry) ? ['error', ...entry.slice(1)] : 'error';
    }
    return { ...config, rules };
  });
}

/**
 * Closes a preset: Prettier always comes last, whatever the preset added.
 *
 * @param {Parameters<typeof defineConfig>} blocks
 */
export function finalize(...blocks) {
  return errorsOnly(defineConfig(...blocks, prettier));
}

/**
 * Shared ESLint flat config. Each package consumes a preset (base, next or nest) from
 * `@app/config/eslint` with a 2-line eslint.config.js:
 * `export default base({ tsconfigRootDir: import.meta.dirname });`
 *
 * @param {{ tsconfigRootDir: string }} opts
 */
export function base({ tsconfigRootDir }) {
  return finalize(...coreBlocks({ tsconfigRootDir }));
}
