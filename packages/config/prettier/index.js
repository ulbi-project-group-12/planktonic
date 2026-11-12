/**
 * Shared Prettier config. The root package.json points at it with
 * `"prettier": "@app/config/prettier"`, so every package formats the same way.
 *
 * @type {import('prettier').Config}
 */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
};

export default config;
