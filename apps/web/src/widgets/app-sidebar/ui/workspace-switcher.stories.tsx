import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HttpResponse, http } from 'msw';
import type { RequestHandler } from 'msw';
import { startApiMocks } from '@/shared/api-mocks';
import { WorkspaceSwitcher } from './workspace-switcher';

const meta = {
  title: 'widgets/AppSidebar/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof WorkspaceSwitcher>;

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

const workspaces = [
  { id: '1', name: 'Alpha Team', slug: 'alpha-team' },
  { id: '2', name: 'Beta Crew', slug: 'beta-crew' },
];

export const Default: Story = {
  loaders: withApiMocks(
    http.get('*/api/workspaces', ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
      return HttpResponse.json(
        workspaces.filter(
          (workspace) =>
            workspace.name.toLowerCase().includes(q) || workspace.slug.toLowerCase().includes(q),
        ),
      );
    }),
  ),
};

export const Empty: Story = {
  loaders: withApiMocks(http.get('*/api/workspaces', () => HttpResponse.json([]))),
};
