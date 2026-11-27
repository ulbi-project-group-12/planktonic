import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib';
import { remarkLimitDepth } from './remark-limit-depth';

interface MarkdownProps {
  content: string;
  className?: string;
}

const linkClassName = 'text-primary underline break-all hover:opacity-80';

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
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0 space-y-1">{children}</ul>,
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
  a: ({ href, id, children }) => {
    // The sanitizer drops a URL with a scheme outside the allow-list; what is left is not a link.
    if (!href) return <span>{children}</span>;
    if (!href.startsWith('#')) return <ExternalLink href={href}>{children}</ExternalLink>;
    return (
      <a id={id} href={href} className={linkClassName}>
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
  return (
    <div data-slot="markdown" className={cn('min-w-0 text-body-s leading-5', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLimitDepth]}
        rehypePlugins={[
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
            },
          ],
        ]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { Markdown, type MarkdownProps };
