import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { DevicesSettingsPage } from './devices-settings-page';

const meta = {
  title: 'Pages/Settings/Devices',
  component: DevicesSettingsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DevicesSettingsPage>;

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

const currentSession = {
  id: '019a8f00-0000-7000-8000-0000000000c1',
  browser: 'Chrome 130',
  os: 'Windows 11',
  signedInAt: '2026-11-20T10:00:00.000Z',
  lastActiveAt: new Date().toISOString(),
  isCurrent: true,
};

/** Three sessions from the default mock; ending one removes its row. */
export const Sessions: Story = { loaders: withApiMocks() };

/** Only this device: nothing to end, so no buttons at all. */
export const OnlyThisDevice: Story = {
  loaders: withApiMocks(http.get('*/api/auth/sessions', () => HttpResponse.json([currentSession]))),
};

export const LoadFailed: Story = {
  loaders: withApiMocks(
    http.get('*/api/auth/sessions', () => HttpResponse.json({ statusCode: 500 }, { status: 500 })),
  ),
};

/** The list loads, every attempt to end a session fails: the banner above the table. */
export const EndFailed: Story = {
  loaders: withApiMocks(
    http.delete('*/api/auth/sessions/:sessionId', () =>
      HttpResponse.json({ statusCode: 500 }, { status: 500 }),
    ),
    http.delete('*/api/auth/sessions', () =>
      HttpResponse.json({ statusCode: 500 }, { status: 500 }),
    ),
  ),
};
