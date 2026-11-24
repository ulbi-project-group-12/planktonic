import { THEME_STORAGE_KEY } from '@/features/theme-switch';

/**
 * Generates the inline script that runs before the first paint.
 * It is fully self-contained: no imports, no React, no external dependencies.
 */
export function getThemeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
  return (
    `(function(k){` +
    `var t;` +
    `try{t=localStorage.getItem(k);}catch(e){}` +
    `if(t!=='light'&&t!=='dark'){` +
    `try{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch(e){t='light';}` +
    `}` +
    `try{` +
    `document.documentElement.classList.toggle('dark',t==='dark');` +
    `document.documentElement.style.colorScheme=t;` +
    `}catch(e){}` +
    `})(${JSON.stringify(storageKey)})`
  );
}
