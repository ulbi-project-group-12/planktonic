import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { VerifyLinkCard } from './verify-link-card';

const meta = {
  title: 'Pages/VerifyEmail',
  component: VerifyLinkCard,
  args: { token: 'demo-token' },
  parameters: {
    // The card navigates with useRouter: mount the framework's App Router mock.
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof VerifyLinkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Starts the worker before the story renders; `handlers` override the default mock set. Each
 * outcome story overrides the verify endpoint itself: the mock's 'valid' token is single-use,
 * so relying on it would make the story depend on the order stories are opened in.
 */
const withApiMocks = (...handlers: RequestHandler[]): NonNullable<Story['loaders']> => [
  async () => {
    await startApiMocks({
      workerUrl: new URL('mockServiceWorker.js', window.location.href).href,
      handlers,
    });
    return {};
  },
];

export const Confirmed: Story = {
  loaders: withApiMocks(
    http.post('*/api/auth/verify-email', () => HttpResponse.json({ status: 'confirmed' })),
  ),
};

export const AlreadyUsed: Story = {
  loaders: withApiMocks(
    http.post('*/api/auth/verify-email', () =>
      HttpResponse.json(
        {
          statusCode: 409,
          message: 'Email verification link has already been used',
          error: 'Conflict',
        },
        { status: 409 },
      ),
    ),
  ),
};

export const Expired: Story = {
  loaders: withApiMocks(
    http.post('*/api/auth/verify-email', () =>
      HttpResponse.json(
        {
          statusCode: 410,
          message: 'Email verification link has expired or is invalid',
          error: 'Gone',
        },
        { status: 410 },
      ),
    ),
  ),
};

export const Failed: Story = {
  loaders: withApiMocks(http.post('*/api/auth/verify-email', () => HttpResponse.error())),
};
