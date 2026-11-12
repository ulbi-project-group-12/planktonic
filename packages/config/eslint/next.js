// @ts-check
// next(): the Next.js App Router preset. It mirrors the composition of Next's own preset
// (Next rules, React rules incl. hooks, the same six a11y rules and ignores) with plugins whose
// peers accept ESLint 10. FSD layers and slice boundaries are Steiger's job (D-04), so no
// import or boundary rule lives here. Usage: packages/config/README.md.
import react from '@eslint-react/eslint-plugin';
import nextPlugin from '@next/eslint-plugin-next';
import { globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import globals from 'globals';
import { CODE_FILES, coreBlocks, finalize, JS_FILES } from './base.js';

/**
 * @param {{ tsconfigRootDir: string }} opts
 */
export function next({ tsconfigRootDir }) {
  return finalize(
    ...coreBlocks({ tsconfigRootDir }),
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
    {
      files: [CODE_FILES],
      extends: [nextPlugin.configs['core-web-vitals']],
      languageOptions: { globals: { ...globals.browser } },
      // Finds app/ or pages/ from the package, not from the cwd (lint-staged runs at the root).
      settings: { next: { rootDir: tsconfigRootDir } },
    },
    // Type-checked React rules need type info, which base() turns off for JS.
    { files: ['**/*.{ts,tsx,mts,cts}'], extends: [react.configs['recommended-type-checked']] },
    { files: [JS_FILES], extends: [react.configs.recommended] },
    {
      files: ['**/*.{tsx,jsx,js}'],
      plugins: { 'jsx-a11y-x': jsxA11y },
      rules: {
        'jsx-a11y-x/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
        'jsx-a11y-x/aria-props': 'error',
        'jsx-a11y-x/aria-proptypes': 'error',
        'jsx-a11y-x/aria-unsupported-elements': 'error',
        'jsx-a11y-x/role-has-required-aria-props': 'error',
        'jsx-a11y-x/role-supports-aria-props': 'error',
      },
    },
    {
      files: ['**/*.tsx'],
      rules: {
        // Async event handlers are fine in JSX attributes.
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
  );
}
