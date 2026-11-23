import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChannelPage } from './channel-page';

const UUID = '0190f5a2-7c1e-7b3a-9f4d-2a6b8c1d0e5f';

async function renderPage(channelId: string) {
  const element = await ChannelPage({
    params: Promise.resolve({ workspaceSlug: 'my-team', channelId }),
  });
  return render(element);
}

describe('ChannelPage', () => {
  it.each([UUID, '123', 'general', ''])(
    'renders a placeholder for channel id %s',
    async (channelId) => {
      const screen = await renderPage(channelId);
      expect(screen.getByText(/Скоро здесь будет страница канала/)).toBeInTheDocument();
      expect(screen.container.querySelector('p')).toHaveTextContent(
        new RegExp(`workspaceSlug = my-team, channelId =\\s*${channelId}`),
      );
    },
  );
});
