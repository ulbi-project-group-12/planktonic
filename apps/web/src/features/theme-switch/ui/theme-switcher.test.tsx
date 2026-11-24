import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../model/theme';
import { ThemeSwitcher } from './theme-switcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the theme button with an accessible label', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole('button', { name: /Тема оформления/ })).toBeInTheDocument();
  });

  it('opens the dropdown and marks the current theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);

    const systemItem = screen.getByRole('menuitem', { name: /Как в системе/ });
    expect(systemItem.querySelectorAll('svg').length).toBe(2);
  });

  it('selects light theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Светлая/ }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('selects dark theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Тёмная/ }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('selects system theme and resolves it through matchMedia', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Как в системе/ }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows a checkmark only on the active item', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Тёмная/ }));

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    const darkItem = screen.getByRole('menuitem', { name: /Тёмная/ });
    const lightItem = screen.getByRole('menuitem', { name: /Светлая/ });

    expect(darkItem.querySelectorAll('svg').length).toBe(2);
    expect(lightItem.querySelectorAll('svg').length).toBe(1);
    expect(darkItem).toHaveAttribute('aria-current', 'true');
    expect(lightItem).not.toHaveAttribute('aria-current');
  });
});
