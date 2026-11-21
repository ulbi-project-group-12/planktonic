import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
// Tailwind 4 + the design tokens: the same globals the root layout loads.
import '../src/_app/styles/globals.css';
import { startApiMocks } from '../src/shared/api';

const ApiDecorator: Decorator = (Story) => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  );
};

/** Applies the toolbar theme to the whole canvas — portals (modal, dropdown, select,
 * tooltip) render into body, so the .dark class belongs on documentElement. */
const ThemeDecorator: Decorator = (Story, context) => {
  const dark = context.globals.theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.backgroundColor = dark ? 'var(--bg-app)' : '';
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
    };
  }, [dark]);

  return <Story />;
};

const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: {
      // Stories render fragments of UI, not pages — the real app provides the landmarks
      // and the h1, so these page-level rules cannot pass inside the canvas by design.
      config: {
        rules: [
          { id: 'landmark-one-main', enabled: false },
          { id: 'page-has-heading-one', enabled: false },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for all stories',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  loaders: [
    async () => {
      await startApiMocks(new URL('mockServiceWorker.js', window.location.href).href);
      return {};
    },
  ],
  decorators: [ThemeDecorator, ApiDecorator],
};

export default preview;
