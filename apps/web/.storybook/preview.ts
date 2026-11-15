import type { Preview } from '@storybook/nextjs-vite';
// Tailwind 4 + глобальные стили: те же, что подключает корневой лейаут.
import '../src/_app/styles/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
};

export default preview;
