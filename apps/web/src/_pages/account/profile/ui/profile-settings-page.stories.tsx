import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { ProfileSettingsPage } from './profile-settings-page';

const meta = {
  title: 'Pages/Settings/Profile',
  component: ProfileSettingsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProfileSettingsPage>;

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

/** The default mock user; a saved name and zone stay until the story reloads. */
export const Profile: Story = { loaders: withApiMocks() };

export const LoadFailed: Story = {
  loaders: withApiMocks(
    http.get('*/api/auth/me', () => HttpResponse.json({ statusCode: 500 }, { status: 500 })),
  ),
};

/** The server refuses the name: the text goes under the field, the input stays. */
export const NameRefused: Story = {
  loaders: withApiMocks(
    http.patch('*/api/users/me', () =>
      HttpResponse.json(
        {
          statusCode: 400,
          message: 'Validation failed',
          issues: [{ path: 'name', message: 'Это имя уже занято' }],
        },
        { status: 400 },
      ),
    ),
  ),
};

/** Every save fails without field issues: the banner above the form. */
export const SaveFailed: Story = {
  loaders: withApiMocks(
    http.patch('*/api/users/me', () => HttpResponse.json({ statusCode: 500 }, { status: 500 })),
  ),
};
