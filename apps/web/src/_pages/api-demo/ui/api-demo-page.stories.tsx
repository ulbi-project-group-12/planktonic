import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ApiDemoPage } from './api-demo-page';

const meta = {
  title: 'API/Health',
  component: ApiDemoPage,
} satisfies Meta<typeof ApiDemoPage>;

export default meta;

export const Mocked: StoryObj<typeof meta> = {};
