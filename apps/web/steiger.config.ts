import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

// steiger-plugin 0.8.1 ships types that import @steiger/toolkit without depending on it, so its
// configs resolve to an error type; steiger's own config type (defineConfig's parameter) restores it.
const recommended = fsd.configs.recommended as unknown as Parameters<typeof defineConfig>[0];

export default defineConfig([
  ...recommended,
  {
    // The FSD Next.js guide renames app/pages to _app/_pages so they cannot clash with Next's
    // routing folders (D-17); @feature-sliced/filesystem maps them, but this rule compares raw names.
    files: ['./src/_app/**', './src/_pages/**'],
    rules: { 'fsd/typo-in-layer-name': 'off' },
  },
]);
