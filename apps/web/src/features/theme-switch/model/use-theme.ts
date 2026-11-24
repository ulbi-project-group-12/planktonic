/* eslint-disable @eslint-react/set-state-in-effect --
   Theme state must be initialized from localStorage/system preference after hydration
   to avoid a server/client mismatch. The initial render stays deterministic. */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type ResolvedTheme,
  type Theme,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  applyTheme as applyThemeToDom,
  readStoredTheme,
  resolveTheme,
} from './theme';

export type { ResolvedTheme, Theme };

export function useTheme() {
  // Deterministic initial state so the server render and the first client render match.
  // The actual theme is applied to the DOM before hydration by the inline init script;
  // this effect only keeps React state in sync after hydration.
  const [themeState, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  const applyTheme = useCallback((next: Theme) => {
    const resolved = resolveTheme(next);
    setThemeState(next);
    setResolvedTheme(resolved);
    applyThemeToDom(next);
  }, []);

  const syncTheme = useCallback((next: Theme) => {
    const resolved = resolveTheme(next);
    setThemeState(next);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      applyTheme(next);
    },
    [applyTheme],
  );

  useEffect(() => {
    applyTheme(readStoredTheme());
  }, [applyTheme]);

  useEffect(() => {
    if (themeState !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      const resolved = event.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };
    media.addEventListener('change', handler);
    return () => {
      media.removeEventListener('change', handler);
    };
  }, [themeState]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      // Read the actual stored value instead of relying on event.newValue,
      // and synchronize without writing back to storage.
      syncTheme(readStoredTheme());
    };
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('storage', handler);
    };
  }, [syncTheme]);

  return { theme: themeState, resolvedTheme, setTheme, isDark: resolvedTheme === 'dark' };
}
