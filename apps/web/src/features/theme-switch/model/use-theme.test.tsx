import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from './theme';
import { useTheme } from './use-theme';

class MockMediaQueryList {
  readonly listeners = new Set<(event: MediaQueryListEvent) => void>();

  private _matches: boolean;

  constructor(matches: boolean) {
    this._matches = matches;
  }

  get matches() {
    return this._matches;
  }

  readonly media = '(prefers-color-scheme: dark)';

  addEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener);
  }

  dispatchEvent(event: MediaQueryListEvent) {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  dispatch(matches: boolean) {
    this._matches = matches;
    this.dispatchEvent({ matches, media: this.media } as MediaQueryListEvent);
  }
}

describe('useTheme', () => {
  let media: MockMediaQueryList;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    media = new MockMediaQueryList(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => media),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('restores the stored choice after mounting', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists system explicitly', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('does not write to the storage when restoring on mount', async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('transitions between light, dark and system', async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      result.current.setTheme('system');
    });
    expect(result.current.theme).toBe('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('reacts to OS preference changes while in system mode', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    act(() => {
      media.dispatch(true);
    });
    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('dark');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    act(() => {
      media.dispatch(false);
    });
    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('light');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('does not react to OS preference changes in explicit light or dark modes', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('light');
    });

    act(() => {
      media.dispatch(true);
    });
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('syncs across tabs through the storage event', async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' }),
      );
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    localStorage.removeItem(THEME_STORAGE_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: null }));
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'invalid' }),
      );
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });
  });

  it('falls back to system when another tab clears the storage', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('ignores storage events for other keys', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'x' }));
    });
    expect(result.current.theme).toBe('dark');
  });

  it('removes subscriptions on unmount', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const { result, unmount } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    unmount();
    expect(media.listeners.size).toBe(0);

    act(() => {
      media.dispatch(true);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).not.toBe('dark');
  });
});
