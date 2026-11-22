import { next } from '@app/config/eslint';

export default [
  ...next({ tsconfigRootDir: import.meta.dirname }),
  {
    // Orval owns these sources. Keep typechecking and the FSD rules active.
    files: ['src/shared/api/generated/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/unified-signatures': 'off',
    },
  },
];
