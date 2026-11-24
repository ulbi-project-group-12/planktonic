import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { AppHeader } from './app-header';

const meta = {
  title: 'widgets/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const withApiMocks = (...handlers: RequestHandler[]): NonNullable<Story['loaders']> => [
  async () => {
    await startApiMocks({
      workerUrl: new URL('mockServiceWorker.js', window.location.href).href,
      handlers,
    });
    return {};
  },
];

export const Default: Story = {
  loaders: withApiMocks(),
};
