import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders basic formatting: bold, italic, lists, inline code and code blocks', () => {
    const content = [
      '**Жирный текст** и *курсив*',
      '',
      '- Первый пункт',
      '- Второй пункт',
      '',
      'Встроенный `const x = 1` код',
      '',
      '```ts',
      'function sum(a: number, b: number) { return a + b; }',
      '```',
    ].join('\n');

    const { container } = render(<Markdown content={content} />);

    expect(container.querySelector('strong')?.textContent).toBe('Жирный текст');
    expect(container.querySelector('em')?.textContent).toBe('курсив');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('code')?.textContent).toBe('const x = 1');
    expect(container.querySelector('pre code')?.textContent).toContain('function sum');
  });

  it('adds rel="noopener noreferrer" to links', () => {
    render(<Markdown content="Документация: [ссылка](https://example.com)" />);

    const link = screen.getByRole('link', { name: /ссылка/ });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('strips raw HTML and script tags (XSS protection)', () => {
    const malicious = 'Привет <script>window.__xss = true</script><b>жирный html</b>';
    const { container } = render(<Markdown content={malicious} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Привет');
  });

  it('removes dangerous event handlers like img onerror', () => {
    const malicious = 'Картинка: <img src="x" onerror="alert(1)" />';
    const { container } = render(<Markdown content={malicious} />);

    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('blocks javascript: protocol in links', () => {
    const malicious = '[Нажми меня](javascript:alert(1))';
    const { container } = render(<Markdown content={malicious} />);

    const link = container.querySelector('a');
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('renders fenced code blocks without language and handles long URLs', () => {
    const longUrl = `https://example.com/${'a'.repeat(300)}`;
    const content = ['```', 'plain code block', '```', '', `[Длинная ссылка](${longUrl})`].join(
      '\n',
    );

    const { container } = render(<Markdown content={content} />);

    expect(container.querySelector('pre code')?.textContent).toContain('plain code block');
    const link = screen.getByRole('link', { name: /Длинная ссылка/ });
    expect(link).toHaveAttribute('href', longUrl);
    expect(link).toHaveClass('break-all');
  });
});
