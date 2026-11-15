import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook для UI-кита (D-21): только пакет фреймворка, без аддонов и телеметрии.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
