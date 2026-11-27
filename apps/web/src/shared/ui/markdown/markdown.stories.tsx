import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Markdown } from './markdown';

const basicSample = [
  'Привет! Подготовил обновление по задаче: **жирный текст**, *курсив* и встроенный код `pnpm test`.',
  '',
  '- Первый пункт списка',
  '- Второй пункт с [внешней ссылкой](https://example.com)',
  '',
  '```ts',
  'function greet(name: string): string {',
  '  return `Hello, ${name}!`;',
  '}',
  '```',
].join('\n');

const longCodeSample = [
  'Блок кода на 500 строк (должен скроллиться и не ломать сетку):',
  '',
  '```ts',
  ...Array.from({ length: 500 }, (_, i) => `const line${String(i + 1)} = "example payload value";`),
  '```',
].join('\n');

const longLinkSample = `Длинная ссылка на 300 символов: [перейти по ссылке](https://example.com/${'a'.repeat(300)})`;

const xssSample = [
  'Попытка XSS-инъекции:',
  '',
  'Скрипт: <script>alert("xss")</script>',
  '',
  'Картинка с обработчиком: <img src="x" onerror="alert(1)" />',
  '',
  'Опасная ссылка: [нажми сюда](javascript:alert(1))',
  '',
  'Картинка с чужого сервера (не загружается, остаётся ссылкой): ![пиксель](https://example.com/pixel.gif)',
  '',
  'Цитата глубиной 500 (разметкой остаются первые уровни, остальное — текст):',
  '',
  `${'>'.repeat(500)} текст`,
].join('\n');

const gfmSample = [
  '# Заголовок первого уровня',
  '## Заголовок второго уровня',
  '### Заголовок третьего уровня',
  '',
  '> Цитата: «сначала тесты на вредный ввод, потом красота».',
  '> > Вложенная цитата.',
  '',
  '3. Список продолжается с тройки',
  '4. Четвёртый пункт',
  '   - вложенный пункт',
  '',
  '- [x] тесты написаны',
  '- [ ] ревью пройдено',
  '',
  '| Колонка | Значение | Очень длинная колонка, которая не помещается в узкое сообщение |',
  '| :-- | --: | :-- |',
  '| `rehype-sanitize` | 6.0.0 | ~~зачёркнутый~~ текст и ссылка https://example.com |',
  '',
  '---',
  '',
  'Текст со сноской[^1].',
  '',
  '[^1]: Текст сноски со ссылкой назад.',
].join('\n');

const meta = {
  title: 'shared/Atoms/Markdown',
  component: Markdown,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    content: basicSample,
  },
};

export const ThemesAndEdgeCases: Story = {
  args: { content: basicSample },
  globals: { theme: 'light' },
  render: () => (
    <div className="flex flex-col gap-8 bg-app p-6 font-sans">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={theme === 'dark' ? 'dark' : undefined}>
          <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-line bg-surface p-6 text-fg-primary">
            <h3 className="text-base font-bold">
              {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
            </h3>
            <div className="rounded-xl border border-line bg-app p-4">
              <Markdown content={basicSample} />
            </div>
            <div className="rounded-xl border border-line bg-app p-4">
              <Markdown content={gfmSample} />
            </div>
            <div className="rounded-xl border border-line bg-app p-4">
              <Markdown content={longLinkSample} />
            </div>
            <div className="rounded-xl border border-line bg-app p-4">
              <Markdown content={xssSample} />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const LongCodeBlock: Story = {
  args: {
    content: longCodeSample,
  },
};
