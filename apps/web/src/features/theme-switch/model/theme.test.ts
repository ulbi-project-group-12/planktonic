import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ResolvedTheme,
  type Theme,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  applyTheme,
  getSystemTheme,
  readStoredTheme,
  resolveTheme,
} from './theme';

function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('theme model', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getSystemTheme', () => {
    it('returns dark when the OS prefers dark', () => {
      vi.stubGlobal('matchMedia', createMatchMedia(true));
      expect(getSystemTheme()).toBe('dark');
    });

    it('returns light when the OS prefers light', () => {
      vi.stubGlobal('matchMedia', createMatchMedia(false));
      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('readStoredTheme', () => {
    it.each<[Theme]>([['light'], ['dark'], ['system']])('returns %s when it is stored', (value) => {
      localStorage.setItem(THEME_STORAGE_KEY, value);
      expect(readStoredTheme()).toBe(value);
    });

    it('falls back to system when no value is stored', () => {
      expect(readStoredTheme()).toBe('system');
    });

    it('falls back to system for invalid stored values', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'neon');
      expect(readStoredTheme()).toBe('system');
    });

    it('falls back to system when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      expect(readStoredTheme()).toBe('system');
    });
  });

  describe('resolveTheme', () => {
    it.each<[Theme, ResolvedTheme]>([
      ['light', 'light'],
      ['dark', 'dark'],
    ])('resolves %s to %s', (theme, expected) => {
      expect(resolveTheme(theme)).toBe(expected);
    });

    it('resolves system to the current OS preference', () => {
      vi.stubGlobal('matchMedia', createMatchMedia(true));
      expect(resolveTheme('system')).toBe('dark');
    });
  });

  describe('applyResolvedTheme', () => {
    it('adds the dark class and sets colorScheme to dark', () => {
      applyResolvedTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('removes the dark class and sets colorScheme to light', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      applyResolvedTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('persists the choice and applies it to the DOM', () => {
      applyTheme('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('stores system explicitly instead of removing the key', () => {
      applyTheme('system');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    });

    it('does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      expect(() => {
        applyTheme('dark');
      }).not.toThrow();
    });
  });
});
