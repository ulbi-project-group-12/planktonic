'use client';

/* eslint-disable @eslint-react/set-state-in-effect --
   Theme hydration requires reading localStorage/system preference in an effect
   because the server cannot access them. The initial render stays deterministic
   to avoid hydration mismatches. */

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function useTheme() {
  // Start from a deterministic value so server and client renders match.
  // Real theme is applied in an effect after hydration to avoid hydration mismatches.
  const [themeState, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((next: Theme) => {
    const resolved = resolveTheme(next);
    setThemeState(next);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    try {
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage may be unavailable (private mode, quota). The theme still applies in memory.
    }
  }, []);

  useEffect(() => {
    applyTheme(readStoredTheme());
  }, [applyTheme]);

  useEffect(() => {
    if (themeState !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      setResolvedTheme(event.matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', event.matches);
    };
    media.addEventListener('change', handler);
    return () => {
      media.removeEventListener('change', handler);
    };
  }, [themeState]);

  const setTheme = useCallback(
    (next: Theme) => {
      applyTheme(next);
    },
    [applyTheme],
  );

  return { theme: themeState, resolvedTheme, setTheme, isDark: resolvedTheme === 'dark' };
}
