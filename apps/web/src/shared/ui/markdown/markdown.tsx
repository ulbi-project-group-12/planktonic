import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib';

interface MarkdownProps {
  content: string;
  className?: string;
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
    const isAnchor = href?.startsWith('#');
    return (
      <a
        id={id}
        href={href}
        target={isAnchor ? undefined : '_blank'}
        rel={isAnchor ? undefined : 'noopener noreferrer'}
        className="text-primary underline break-all hover:opacity-80"
      >
        {children}
      </a>
    );
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
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { Markdown, type MarkdownProps };
