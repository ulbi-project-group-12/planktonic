import { useEffect } from 'react';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
// Tailwind 4 + the design tokens: the same globals the root layout loads.
import '../src/_app/styles/globals.css';

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
  decorators: [ThemeDecorator],
};

export default preview;
