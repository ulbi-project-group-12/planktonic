import { resolve } from 'node:path';
import { exportOpenApi } from './core/openapi/openapi-export.js';

const outputPath = resolve(process.argv[2] ?? 'apps/api/dist/openapi.json');

try {
  await exportOpenApi(outputPath);
  console.log(`OpenAPI exported to ${outputPath}`);
} catch (error) {
  console.error('OpenAPI export failed:', error);
  process.exitCode = 1;
}
