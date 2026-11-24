import { THEME_STORAGE_KEY } from '@/features/theme-switch';

/**
 * Generates the inline script that runs before the first paint.
 * It is fully self-contained: no imports, no React, no external dependencies.
 */
export function getThemeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
  return (
    `(function(k){` +
    `try{` +
    `var t=localStorage.getItem(k);` +
    `if(t!=='light'&&t!=='dark'){` +
    `t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';` +
    `}` +
    `document.documentElement.classList.toggle('dark',t==='dark');` +
    `document.documentElement.style.colorScheme=t;` +
    `}catch(e){}` +
    `})(${JSON.stringify(storageKey)})`
  );
}
