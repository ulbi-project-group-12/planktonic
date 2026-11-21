import { join } from 'node:path';
import { defineConfig } from 'orval';

const checkDir = process.env.ORVAL_CHECK_DIR;
const generated = checkDir ? join(checkDir, 'generated') : './src/shared/api/generated';
const mutator = checkDir ? join(checkDir, 'http-client.ts') : './src/shared/api/http-client.ts';

export default defineConfig({
  api: {
    input: checkDir ? join(checkDir, 'openapi.json') : '../api/dist/openapi.json',
    output: {
      target: join(generated, 'api.ts'),
      schemas: join(generated, 'models'),
      client: 'react-query',
      httpClient: 'fetch',
      clean: [generated],
      formatter: 'prettier',
      urlEncodeParameters: true,
      override: {
        mutator: { path: mutator, name: 'apiFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
      mock: {
        generators: [{ type: 'msw', delay: false }],
      },
    },
  },
});
