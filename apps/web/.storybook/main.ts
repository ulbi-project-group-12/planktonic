import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook for the UI kit (D-21): framework package only, no addons, no telemetry.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
