import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook for the UI kit (D-21): framework + the a11y addon (axe) on every story, no telemetry.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
