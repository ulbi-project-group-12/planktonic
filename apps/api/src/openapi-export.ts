// `pnpm openapi:export [path]`: writes the API's OpenAPI document (default `apps/api/dist/openapi.json`).
// `OPENAPI_EXPORT_PATH` overrides the path: used by check-generated-api.mjs, where argv would
// pass through cmd.exe and get `%VAR%`-expanded.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fixed, whatever the shell exports, so the file is the same on every machine and in CI:
// - NODE_ENV=production: no env file is read (core/config/env-file.ts) and only production routes
//   are registered;
// - URLs that only have to pass validateEnv: nothing connects to them (see openapi.ts).
Object.assign(process.env, {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://openapi:openapi@127.0.0.1:1/openapi',
  REDIS_URL: 'redis://127.0.0.1:1',
  REALTIME_DEBUG: 'false',
});

const explicitPath = process.env.OPENAPI_EXPORT_PATH ?? process.argv[2];
const outputPath = explicitPath
  ? resolve(explicitPath)
  : fileURLToPath(new URL('openapi.json', import.meta.url));

try {
  // Imported only now: ConfigModule validates the environment when AppModule is loaded.
  const { exportOpenApi } = await import('./openapi.js');
  await exportOpenApi(outputPath);
  console.log(`OpenAPI exported to ${outputPath}`);
} catch (error) {
  console.error('OpenAPI export failed:', error);
  process.exitCode = 1;
}
