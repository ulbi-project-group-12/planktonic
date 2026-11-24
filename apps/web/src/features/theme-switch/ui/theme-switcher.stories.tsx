/* eslint-disable @eslint-react/set-state-in-effect --
   The story wrapper needs to prepare localStorage/matchMedia before the component mounts. */

import { useEffect, useRef, useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ResolvedTheme, type Theme, THEME_STORAGE_KEY } from '../model/theme';
import { ThemeSwitcher } from './theme-switcher';

interface ThemeSwitcherStoryProps {
  storedTheme: Theme;
  resolved: ResolvedTheme;
}

function ThemeSwitcherStory({ storedTheme, resolved }: ThemeSwitcherStoryProps) {
  const [ready, setReady] = useState(false);
  const originalMatchMediaRef = useRef<typeof window.matchMedia | null>(null);

  useEffect(() => {
    originalMatchMediaRef.current = window.matchMedia.bind(window);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: resolved === 'dark' && query.includes('prefers-color-scheme: dark'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
    setReady(true);

    return () => {
      localStorage.removeItem(THEME_STORAGE_KEY);
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = '';
      if (originalMatchMediaRef.current !== null) {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          configurable: true,
          value: originalMatchMediaRef.current,
        });
      }
    };
  }, [resolved, storedTheme]);

  if (!ready) return null;

  return <ThemeSwitcher />;
}

const meta = {
  title: 'features/ThemeSwitcher',
  component: ThemeSwitcher,
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const openMenu = async () => {
  const storyUser = userEvent.setup();
  await storyUser.click(screen.getByRole('button', { name: /Тема оформления/ }));
};

export const Light: Story = {
  parameters: { globals: { theme: 'light' } },
  render: () => <ThemeSwitcherStory storedTheme="light" resolved="light" />,
  play: openMenu,
};

export const Dark: Story = {
  parameters: { globals: { theme: 'dark' } },
  render: () => <ThemeSwitcherStory storedTheme="dark" resolved="dark" />,
  play: openMenu,
};

export const System: Story = {
  parameters: { globals: { theme: 'light' } },
  render: () => <ThemeSwitcherStory storedTheme="system" resolved="light" />,
  play: openMenu,
};
