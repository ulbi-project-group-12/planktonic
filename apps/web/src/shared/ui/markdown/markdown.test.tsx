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

    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.textContent).toBe('Нажми меня');
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

describe('Markdown: GFM extras', () => {
  it('links a footnote reference and its note to each other', () => {
    const { container } = render(<Markdown content={'Текст[^1]\n\n[^1]: Примечание'} />);

    const [reference, back] = [...container.querySelectorAll<HTMLAnchorElement>('a')];
    const note = container.querySelector('li');
    expect(reference?.getAttribute('href')).toBe(`#${note?.id ?? ''}`);
    expect(back?.getAttribute('href')).toBe(`#${reference?.id ?? ''}`);
    expect(note?.id).not.toBe('');
    expect(reference).not.toHaveAttribute('target');
  });

  it('keeps footnote ids unique across messages', () => {
    const content = 'Текст[^1]\n\n[^1]: Примечание';
    const { container } = render(
      <>
        <Markdown content={content} />
        <Markdown content={content} />
      </>,
    );

    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the start number of an ordered list', () => {
    const { container } = render(<Markdown content={'3. Третий\n4. Четвёртый'} />);

    expect(container.querySelector('ol')).toHaveAttribute('start', '3');
  });

  it('renders headings, quotes, tables and task lists', () => {
    const content = [
      '# Заголовок',
      '',
      '> Цитата',
      '',
      '| a | b |',
      '| - | -: |',
      '| 1 | 2 |',
      '',
      '- [x] сделано',
      '- [ ] не сделано',
    ].join('\n');

    render(<Markdown content={content} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Заголовок' })).toHaveClass('font-bold');
    expect(screen.getByText('Цитата').closest('blockquote')).toHaveClass('border-l-2');
    // A wide table scrolls inside its own box instead of stretching the message.
    expect(screen.getByRole('table').parentElement).toHaveClass('overflow-x-auto');
    expect(screen.getByRole('cell', { name: '2' })).toHaveStyle({ textAlign: 'right' });
    const [done, todo] = screen.getAllByRole('checkbox');
    expect(done).toBeChecked();
    expect(done).toBeDisabled();
    expect(todo).not.toBeChecked();
  });
});
