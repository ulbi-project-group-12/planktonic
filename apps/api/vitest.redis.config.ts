import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/**/*.redis-spec.ts'],
    testTimeout: 15_000,
    hookTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://probe:probe@127.0.0.1:1/probe',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:56379',
    },
  },
});
