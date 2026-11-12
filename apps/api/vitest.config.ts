// Vitest for the NestJS api (D-15). Vite's own transform drops decorator metadata, which Nest's
// DI needs, so unplugin-swc compiles the TypeScript instead (NestJS Vitest recipe).
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
  },
});
