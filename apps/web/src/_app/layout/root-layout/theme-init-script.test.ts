import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/features/theme-switch';
import { getThemeInitScript } from './theme-init-script';

function stubSystemTheme(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ matches: dark, media: query })),
  );
}

/** Runs the generated source the way the browser runs the inline <script>. */
function runInitScript() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the script is a static string built by our own code
  const run = new Function(getThemeInitScript()) as () => void;
  run();
}

describe('theme init script', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.classList.remove('dark');
    root.style.colorScheme = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('applies a stored dark theme even when the OS prefers light', () => {
    stubSystemTheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    runInitScript();
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('applies a stored light theme even when the OS prefers dark', () => {
    stubSystemTheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    root.classList.add('dark');
    runInitScript();
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });

  it.each([['system'], ['invalid'], [null]])(
    'follows the OS preference when the stored value is %s',
    (stored) => {
      stubSystemTheme(true);
      if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
      runInitScript();
      expect(root.classList.contains('dark')).toBe(true);
      expect(root.style.colorScheme).toBe('dark');
    },
  );

  it('still follows the OS preference when localStorage throws', () => {
    stubSystemTheme(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    runInitScript();
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('falls back to light when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    runInitScript();
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });

  it('embeds the storage key as a JSON string literal', () => {
    expect(getThemeInitScript('a"b</script>')).toContain(JSON.stringify('a"b</script>'));
  });
});
