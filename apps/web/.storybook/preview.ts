import type { Preview } from '@storybook/nextjs-vite';
// Tailwind 4 + the shadcn theme: the same globals the root layout loads.
import '../src/_app/styles/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
};

export default preview;
