import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

// steiger-plugin 0.8.1 поставляет типы, которые импортируют @steiger/toolkit, не завися
// от него, поэтому его конфиги резолвятся в error-тип; собственный тип конфига steiger
// (параметр defineConfig) это исправляет.
const recommended = fsd.configs.recommended as unknown as Parameters<typeof defineConfig>[0];

export default defineConfig([
  ...recommended,
  {
    // Гайд FSD для Next.js переименовывает app/pages в _app/_pages, чтобы они не пересекались
    // с роутинг-папками Next (D-17); @feature-sliced/filesystem их маппит, но это правило
    // сравнивает сырые имена.
    files: ['./src/_app/**', './src/_pages/**'],
    rules: { 'fsd/typo-in-layer-name': 'off' },
  },
]);
