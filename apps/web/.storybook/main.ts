import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs-vite';
import { mergeConfig } from 'vite';

// Storybook for the UI kit (D-21): framework + the a11y addon (axe) on every story, no telemetry.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => {
    // Stories read contracts from source, like the tests (vitest.config.ts): the package's
    // `default` export is dist/, and neither `pnpm storybook` nor the CI job builds it first.
    const contracts = fileURLToPath(
      new URL('../../../packages/contracts/src/index.ts', import.meta.url),
    );
    return mergeConfig(viteConfig, { resolve: { alias: { '@app/contracts': contracts } } });
  },
};

export default config;
