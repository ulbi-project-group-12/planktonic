import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChannelPage } from './channel-page';

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

const UUID = '0190f5a2-7c1e-7b3a-9f4d-2a6b8c1d0e5f';

async function renderPage(channelId: string) {
  const element = await ChannelPage({
    params: Promise.resolve({ workspaceSlug: 'my-team', channelId }),
  });
  return render(element);
}

describe('ChannelPage', () => {
  it('renders for a uuid channel id', async () => {
    const screen = await renderPage(UUID);
    expect(screen.getByText(/channelId = /)).toBeInTheDocument();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it.each(['123', 'general', ''])('calls notFound for %s', async (channelId) => {
    await expect(renderPage(channelId)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
