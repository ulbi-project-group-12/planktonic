import { defineConfig, globalIgnores } from 'eslint/config';
import { base } from './eslint/index.js';

// The fixtures are broken on purpose; only the preset tests lint them.
export default defineConfig(
  base({ tsconfigRootDir: import.meta.dirname }),
  globalIgnores(['test/fixtures/**']),
);
