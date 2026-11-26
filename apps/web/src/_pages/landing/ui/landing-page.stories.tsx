import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { LandingPage } from './landing-page';

const meta = {
  title: 'Pages/Landing',
  component: LandingPage,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
} satisfies Meta<typeof LandingPage>;

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

/** A guest: the refresh is rejected, so the call to action leads to the registration. */
export const Guest: Story = {
  loaders: withApiMocks(
    http.post('*/api/auth/refresh', () =>
      HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
    ),
  ),
};

/** The default mock restores a session, so the call to action leads to the app. */
export const SignedIn: Story = { loaders: withApiMocks() };
