// Placeholder entry for @app/api, so the pipeline runs end to end.
// The NestJS skeleton replaces this file in Phase 1.1 (team ticket 1.5).
//
// The product name is read from PRODUCT_NAME and never spelled here (D-33).
// Erasable TypeScript only: Node 26 runs this file directly (type stripping).

/** The env value, or the fallback when it is unset or empty (a Docker ENV from an unset ARG is ""). */
function fromEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

const name = '@app/api';
const version = fromEnv('APP_VERSION', 'dev');
const product = fromEnv('PRODUCT_NAME', 'this project');

console.log(
  `${name} ${version} for ${product}: placeholder, the NestJS skeleton arrives in Phase 1.1`,
);
