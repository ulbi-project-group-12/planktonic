import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MESSAGE_BODY_MAX_LENGTH } from '@app/contracts';
import { Markdown } from './markdown';
import { MAX_DEPTH } from './remark-limit-depth';

/** Elements that can run code, load a remote resource or restyle the page. */
const activeElements =
  'script, style, img, svg, iframe, object, embed, form, button, video, audio, link, meta, base, details';

function renderMarkdown(content: string): HTMLElement {
  return render(<Markdown content={content} />).container;
}

function attributeNames(container: HTMLElement): string[] {
  return [...container.querySelectorAll('*')].flatMap((element) => element.getAttributeNames());
}

/** How many elements deep the deepest element sits under the container. */
function depthOf(container: HTMLElement): number {
  let deepest = 0;
  for (const element of container.querySelectorAll('*')) {
    let depth = 0;
    for (let node: Element | null = element; node && node !== container; node = node.parentElement)
      depth += 1;
    deepest = Math.max(deepest, depth);
  }
  return deepest;
}

describe('Markdown: raw HTML', () => {
  it.each([
    ['inline script', 'до <script>window.__xss = true</script> после'],
    ['block script', '<script>\nwindow.__xss = true\n</script>'],
    ['img onerror', '<img src="x" onerror="alert(1)">'],
    ['svg onload', '<svg onload="alert(1)"><circle /></svg>'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ['inline handler and style', '<div onclick="alert(1)" style="position:fixed;inset:0">x</div>'],
    ['html link', '<a href="javascript:alert(1)" onmouseover="alert(1)">x</a>'],
    ['style tag', '<style>body { display: none }</style>'],
    [
      'form',
      '<form action="https://evil.example"><input name="q" autofocus onfocus="alert(1)"><button>go</button></form>',
    ],
    ['details ontoggle', '<details open ontoggle="alert(1)"><summary>s</summary>b</details>'],
    ['object and embed', '<object data="x"></object><embed src="x">'],
    ['meta refresh', '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
    ['base', '<base href="https://evil.example/">'],
    [
      'html inside markdown',
      '**жирный <img src=x onerror=alert(1)>** и [ссылка <svg onload=alert(1)>](https://example.com)',
    ],
    ['unclosed tag', '<script>alert(1)'],
    ['comment and processing instruction', '<!-- <script>alert(1)</script> --><?php x ?>'],
    ['id clobbering', '<h1 id="document">x</h1><a name="location">y</a>'],
  ])('renders no active element or attribute: %s', (_name, content) => {
    const container = renderMarkdown(content);

    expect(container.querySelector(activeElements)).toBeNull();
    expect(container.querySelector('input:not([type="checkbox"])')).toBeNull();
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    for (const name of attributeNames(container)) {
      expect(name).not.toMatch(/^on/);
      expect(['style', 'srcdoc', 'action', 'name']).not.toContain(name);
    }
    expect(window).not.toHaveProperty('__xss');
  });

  it('keeps the text around the removed markup', () => {
    const container = renderMarkdown('до <script>alert(1)</script> после');

    expect(container.textContent).toContain('до');
    expect(container.textContent).toContain('после');
  });
});

describe('Markdown: link schemes', () => {
  it.each([
    ['javascript', '[x](javascript:alert(1))'],
    ['mixed case', '[x](JaVaScRiPt:alert(1))'],
    ['leading whitespace', '[x]( javascript:alert(1))'],
    ['leading whitespace in angle brackets', '[x](<  javascript:alert(1)>)'],
    ['tab inside the scheme', '[x](java&#9;script:alert(1))'],
    ['newline inside the scheme', '[x](java&#10;script:alert(1))'],
    ['leading control character', '[x](&#1;javascript:alert(1))'],
    ['entity for a letter', '[x](java&#x73;cript:alert(1))'],
    ['named entity for the colon', '[x](javascript&colon;alert(1))'],
    ['numeric entity for the colon', '[x](javascript&#58;alert(1))'],
    ['data', '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
    ['vbscript', '[x](vbscript:msgbox(1))'],
    ['file', '[x](file:///etc/passwd)'],
    ['tel', '[x](tel:+10000000000)'],
    ['irc', '[x](irc://irc.example/channel)'],
    ['custom app scheme', '[x](slack://open)'],
    ['reference-style link', '[x][ref]\n\n[ref]: javascript:alert(1)'],
    ['reference-style link, upper case', '[x][ref]\n\n[ref]: <JAVASCRIPT:alert(1)> "title"'],
    ['autolink', '<javascript:alert(1)>'],
    ['autolink with data', '<data:text/html,<script>alert(1)</script>>'],
  ])('is not clickable: %s', (_name, content) => {
    const container = renderMarkdown(content);

    expect(container.querySelector('a[href]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('keeps a raw tab from forming a link at all', () => {
    const container = renderMarkdown('[x](java\tscript:alert(1))');

    expect(container.querySelector('a')).toBeNull();
  });

  it.each([
    ['https', '[x](https://example.com/a?b=1#c)', 'https://example.com/a?b=1#c'],
    ['http', '[x](http://example.com)', 'http://example.com'],
    ['mailto', '[x](mailto:team@example.com)', 'mailto:team@example.com'],
    ['autolink', '<https://example.com>', 'https://example.com'],
    ['bare url', 'см. https://example.com/x', 'https://example.com/x'],
    ['bare www', 'см. www.example.com', 'http://www.example.com'],
    ['reference-style link', '[x][ref]\n\n[ref]: https://example.com', 'https://example.com'],
    ['path on this site', '[x](/workspaces)', '/workspaces'],
    ['path that only looks like a scheme', '[x](/javascript:alert(1))', '/javascript:alert(1)'],
  ])('opens in a new tab without an opener: %s', (_name, content, href) => {
    renderMarkdown(content);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not let a link title break out of the attribute', () => {
    const container = renderMarkdown('[x](https://example.com "\\" onmouseover=\\"alert(1)")');

    expect(attributeNames(container)).not.toContain('onmouseover');
  });
});

describe('Markdown: images', () => {
  it.each([
    ['inline image', '![пиксель](https://tracker.example/p.gif "title")'],
    ['reference-style image', '![пиксель][ref]\n\n[ref]: https://tracker.example/p.gif'],
  ])('does not load a remote image, links to it instead: %s', (_name, content) => {
    const container = renderMarkdown(content);

    expect(container.querySelector('img')).toBeNull();
    const link = screen.getByRole('link', { name: 'пиксель' });
    expect(link).toHaveAttribute('href', 'https://tracker.example/p.gif');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    ['inline', '[![значок](https://img.example/a.png)](https://example.com)'],
    ['inside emphasis', '[**![значок](https://img.example/a.png)**](https://example.com)'],
    [
      'reference-style',
      '[![значок][img]][site]\n\n[img]: https://img.example/a.png\n[site]: https://example.com',
    ],
  ])('keeps a linked image as one link to the link target: %s', (_name, content) => {
    const container = renderMarkdown(content);

    expect(container.querySelector('a a, img')).toBeNull();
    expect(screen.getByRole('link', { name: 'значок' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
  });

  it('labels an image without alt text with its address', () => {
    renderMarkdown('![](https://tracker.example/p.gif)');

    expect(screen.getByRole('link', { name: 'https://tracker.example/p.gif' })).toBeVisible();
  });

  it.each([
    ['javascript', '![подпись](javascript:alert(1))'],
    ['data', '![подпись](data:image/png;base64,AAAA)'],
  ])('leaves only the alt text for an unsafe source: %s', (_name, content) => {
    const container = renderMarkdown(content);

    expect(container.querySelector('img, a')).toBeNull();
    expect(container.textContent).toBe('подпись');
  });
});

describe('Markdown: hostile size and nesting', () => {
  it.each([
    ['nested quotes', `${'>'.repeat(MESSAGE_BODY_MAX_LENGTH - 2)} x`],
    ['nested quotes with spaces', `${'> '.repeat(MESSAGE_BODY_MAX_LENGTH / 2 - 1)}x`],
    [
      'nested lists',
      Array.from({ length: 60 }, (_, level) => `${' '.repeat(level * 2)}- x`).join('\n'),
    ],
    ['nested emphasis', `${'*a _b '.repeat(300)}x${'_ *'.repeat(300)}`],
    ['nested link text', `${'['.repeat(1000)}x${'](https://example.com)'.repeat(100)}`],
  ])('renders without overflowing the stack: %s', (_name, content) => {
    expect(content.length).toBeLessThanOrEqual(MESSAGE_BODY_MAX_LENGTH);

    const container = renderMarkdown(content);

    expect(container.textContent).toContain('x');
    // +2: the wrapper and one element a node may add (li > p, table > tbody).
    expect(depthOf(container)).toBeLessThanOrEqual(MAX_DEPTH + 2);
  });

  it('keeps ordinary nesting as markup', () => {
    const container = renderMarkdown('> > > - a\n> > >   - **b**');

    expect(container.querySelectorAll('blockquote')).toHaveLength(3);
    expect(container.querySelector('blockquote ul ul strong')?.textContent).toBe('b');
  });

  it.each([
    ['one long word', 'a'.repeat(MESSAGE_BODY_MAX_LENGTH)],
    ['unmatched emphasis', '*'.repeat(MESSAGE_BODY_MAX_LENGTH - 1) + 'a'],
    ['unmatched brackets', '['.repeat(MESSAGE_BODY_MAX_LENGTH)],
    ['unclosed links', '[a]('.repeat(MESSAGE_BODY_MAX_LENGTH / 4)],
    ['backticks', '`'.repeat(MESSAGE_BODY_MAX_LENGTH - 1) + 'a'],
    ['angle brackets', '<'.repeat(MESSAGE_BODY_MAX_LENGTH)],
    ['entities', '&'.repeat(MESSAGE_BODY_MAX_LENGTH)],
    ['bare domain', `www.${'a.'.repeat(MESSAGE_BODY_MAX_LENGTH / 2 - 2)}`],
    ['email-like', `a@${'b.'.repeat(MESSAGE_BODY_MAX_LENGTH / 2 - 1)}`],
  ])('renders a message of maximum length: %s', (_name, content) => {
    expect(content.length).toBeLessThanOrEqual(MESSAGE_BODY_MAX_LENGTH);

    expect(() => renderMarkdown(content)).not.toThrow();
  });
});
