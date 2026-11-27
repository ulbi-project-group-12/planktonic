import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib';
import { remarkLimitDepth } from './remark-limit-depth';

interface MarkdownProps {
  content: string;
  className?: string;
}

// Same colors as the Link atom: the base brand color gives only 3.78:1 on the dark background.
const linkClassName =
  'text-brand-primary underline break-all hover:opacity-80 dark:text-brand-text';

const headingClassName = 'mt-3 mb-1 font-bold break-words first:mt-0 last:mb-0';

/** A link that leaves the page: always a new tab, never a handle on our window. */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {children}
    </a>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 break-words">{children}</p>,
  h1: ({ children }) => <h1 className={cn(headingClassName, 'text-body-l')}>{children}</h1>,
  h2: ({ id, className, children }) => (
    // `className` carries `sr-only` for the hidden "Footnotes" heading.
    <h2 id={id} className={cn(headingClassName, 'text-body', className)}>
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className={headingClassName}>{children}</h3>,
  h4: ({ children }) => <h4 className={headingClassName}>{children}</h4>,
  h5: ({ children }) => <h5 className={headingClassName}>{children}</h5>,
  h6: ({ children }) => <h6 className={headingClassName}>{children}</h6>,
  ul: ({ className, children }) => (
    <ul
      className={cn(
        'mb-2 space-y-1 last:mb-0',
        // Task lists bring their own checkboxes instead of bullets.
        className?.includes('contains-task-list') ? 'list-none' : 'list-disc pl-5',
      )}
    >
      {children}
    </ul>
  ),
  ol: ({ start, children }) => (
    <ol start={start} className="mb-2 list-decimal pl-5 last:mb-0 space-y-1">
      {children}
    </ol>
  ),
  li: ({ id, children }) => (
    <li id={id} className="break-words">
      {children}
    </li>
  ),
  input: ({ type, checked, disabled }) => (
    <input
      type={type}
      checked={checked}
      disabled={disabled}
      readOnly
      className="mr-1.5 align-middle"
    />
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-fg-secondary last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-line" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto last:mb-0">
      <table className="border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ style, children }) => (
    <th style={style} className="border border-line bg-sunken px-2 py-1 font-semibold">
      {children}
    </th>
  ),
  td: ({ style, children }) => (
    <td style={style} className="border border-line px-2 py-1">
      {children}
    </td>
  ),
  a: ({ href, id, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy, children }) => {
    // The sanitizer drops a URL with a scheme outside the allow-list; what is left is not a link.
    if (!href) return <span>{children}</span>;
    if (!href.startsWith('#')) return <ExternalLink href={href}>{children}</ExternalLink>;
    return (
      // Footnote references and back-links: they find each other by `id`.
      <a
        id={id}
        href={href}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={linkClassName}
      >
        {children}
      </a>
    );
  },
  // Remote images are not loaded: the request would tell a third-party server who read the
  // message and when. The image stays reachable as an ordinary link.
  img: ({ src, alt }) => {
    const url = typeof src === 'string' ? src : '';
    const label = alt === undefined || alt === '' ? url : alt;
    return url ? <ExternalLink href={url}>{label}</ExternalLink> : label;
  },
  pre: ({ children }) => (
    <pre className="my-2 max-h-96 overflow-auto rounded-md bg-sunken p-3 text-xs leading-relaxed last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit [&>code]:break-normal">
      {children}
    </pre>
  ),
  code: ({ className, children }) => (
    <code
      className={cn(
        'rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.875em] break-all',
        className,
      )}
    >
      {children}
    </code>
  ),
};

function Markdown({ content, className }: MarkdownProps) {
  // Footnote ids must be unique on a page that shows many messages, each with its own `[^1]`.
  const idPrefix = `${useId()}-`;

  return (
    <div data-slot="markdown" className={cn('min-w-0 text-body-s leading-5', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLimitDepth]}
        remarkRehypeOptions={{ clobberPrefix: '' }}
        rehypePlugins={[
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              // The sanitizer puts this prefix on every id, so an id cannot shadow page globals.
              clobberPrefix: idPrefix,
              protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
            },
          ],
        ]}
        // Runs after the sanitizer: point in-document links at the prefixed ids.
        urlTransform={(url) =>
          url.startsWith('#') ? `#${idPrefix}${url.slice(1)}` : defaultUrlTransform(url)
        }
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { Markdown, type MarkdownProps };
