import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { ApiDemoPage } from './api-demo-page';

const meta = {
  title: 'API/Health',
  component: ApiDemoPage,
} satisfies Meta<typeof ApiDemoPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Starts the worker before the story renders; `handlers` override the default mock set. */
const withApiMocks = (...handlers: RequestHandler[]): NonNullable<Story['loaders']> => [
  async () => {
    await startApiMocks({
      workerUrl: new URL('mockServiceWorker.js', window.location.href).href,
      handlers,
    });
    return {};
  },
];

export const Mocked: Story = { loaders: withApiMocks() };

export const Unavailable: Story = {
  loaders: withApiMocks(http.get('*/api/health', () => new HttpResponse(null, { status: 503 }))),
};
