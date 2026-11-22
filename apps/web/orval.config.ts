import { join } from 'node:path';
import { faker } from '@faker-js/faker';
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
        mock: {
          properties: {
            // The contract describes seq with an anchored pattern, and faker's fromRegExp keeps
            // the anchors ("^2$"). Orval copies this function into the generated mocks.
            seq: () =>
              faker.string.numeric({ length: { min: 1, max: 6 }, allowLeadingZeros: false }),
          },
        },
      },
      mock: {
        // generateEachHttpStatus adds a response factory and a handler per documented status,
        // so tests and stories can mock 400, 404 and 409 without hand-written bodies.
        generators: [{ type: 'msw', delay: false, generateEachHttpStatus: true }],
      },
    },
  },
});
