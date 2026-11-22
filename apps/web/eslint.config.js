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
  {
    // Test-only modules must not reach the application bundle: they pull in msw/node and
    // @testing-library/react, which are devDependencies.
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ignores: [
      'src/**/*.test.{ts,tsx}',
      'src/shared/api-mocks-node/**',
      'src/shared/lib/testing/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // The alias form and relative paths from inside shared/ (../api-mocks-node, ./testing).
              regex: '(^|/)(api-mocks-node|lib/testing)(/|$)|^\\./testing(/|$)',
              message: 'Test-only module: import it from *.test.ts(x) files only.',
            },
          ],
        },
      ],
    },
  },
  {
    // One QueryClient configuration for the app, Storybook and tests.
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/query-client.ts', 'src/shared/api/generated/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='QueryClient']",
          message: 'Use createQueryClient() from @/shared/api.',
        },
      ],
    },
  },
];
