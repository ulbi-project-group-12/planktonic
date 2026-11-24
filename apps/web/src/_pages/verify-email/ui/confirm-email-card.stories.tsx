import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { ConfirmEmailCard } from './confirm-email-card';

const meta = {
  title: 'Pages/VerifyEmail',
  component: ConfirmEmailCard,
  parameters: {
    // The card navigates with useRouter: mount the framework's App Router mock.
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof ConfirmEmailCard>;

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

/** The signed-in user sees the address from their profile and a working resend. */
export const ConfirmEmail: Story = { loaders: withApiMocks() };

/** The api answers 429: the button locks for the wait the server reports. */
export const ResendLimited: Story = {
  loaders: withApiMocks(
    http.post('*/api/auth/verify-email/resend', () =>
      HttpResponse.json(
        { statusCode: 429, message: 'Too many requests', retryAfterSec: 45 },
        { status: 429 },
      ),
    ),
  ),
};

/** Without a session there is no address to resend to: the card offers to sign in. */
export const Guest: Story = {
  loaders: withApiMocks(
    http.get('*/api/auth/me', () =>
      HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
    ),
  ),
};
