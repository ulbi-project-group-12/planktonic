import { useEffect, useState } from 'react';

interface SpacingToken {
  /** Token name — the utility suffix: p-s, gap-m, m-1xl, … */
  name: string;
  /** Raw CSS variable from tokens/spacings.css. */
  cssVar: string;
  /** Literal width utility for the demo bar (Tailwind picks it up from the source). */
  barClass: string;
  /** Same value on mobile and desktop. */
  fixed: boolean;
}

const spacingTokens: SpacingToken[] = [
  { name: 'zero', cssVar: '--space-zero', barClass: 'w-zero', fixed: true },
  { name: 'nano', cssVar: '--space-nano', barClass: 'w-nano', fixed: false },
  { name: 'nano-fix', cssVar: '--space-nano-fix', barClass: 'w-nano-fix', fixed: true },
  { name: 'micro', cssVar: '--space-micro', barClass: 'w-micro', fixed: true },
  { name: 's', cssVar: '--space-s', barClass: 'w-s', fixed: false },
  { name: 'm', cssVar: '--space-m', barClass: 'w-m', fixed: false },
  { name: 'l', cssVar: '--space-l', barClass: 'w-l', fixed: false },
  { name: 'xl', cssVar: '--space-xl', barClass: 'w-xl', fixed: false },
  { name: 's-fix', cssVar: '--space-s-fix', barClass: 'w-s-fix', fixed: true },
  { name: 'm-fix', cssVar: '--space-m-fix', barClass: 'w-m-fix', fixed: true },
  { name: 'l-fix', cssVar: '--space-l-fix', barClass: 'w-l-fix', fixed: true },
  { name: '1xl', cssVar: '--space-1xl', barClass: 'w-1xl', fixed: false },
  { name: '2xl', cssVar: '--space-2xl', barClass: 'w-2xl', fixed: false },
  { name: '3xl', cssVar: '--space-3xl', barClass: 'w-3xl', fixed: false },
  { name: '4xl', cssVar: '--space-4xl', barClass: 'w-4xl', fixed: false },
  { name: '5xl', cssVar: '--space-5xl', barClass: 'w-5xl', fixed: false },
  { name: '6xl', cssVar: '--space-6xl', barClass: 'w-6xl', fixed: false },
  { name: '7xl', cssVar: '--space-7xl', barClass: 'w-7xl', fixed: false },
];

/** Measures the rendered width of every demo bar (depends on the breakpoint). */
function useMeasuredWidths(): Record<string, number> {
  const [widths, setWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    const update = () => {
      const next: Record<string, number> = {};
      for (const element of document.querySelectorAll<HTMLElement>('[data-spacing-bar]')) {
        next[element.dataset.spacingBar ?? ''] = Math.round(element.getBoundingClientRect().width);
      }
      setWidths(next);
    };
    // first measure after paint; then follow resizes
    const frame = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, []);

  return widths;
}

function SpacingRow({ token, width }: { token: SpacingToken; width: number | undefined }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 shrink-0">
        <div className="text-caption font-bold text-fg-primary">{token.name}</div>
        <div className="text-micro text-fg-muted">{token.cssVar}</div>
      </div>
      <div className="relative h-8 flex-1">
        <div className="absolute inset-0 rounded-md bg-sunken" />
        <div
          data-spacing-bar={token.name}
          className={`absolute top-0 left-0 h-full rounded-md bg-brand-primary ${token.barClass}`}
        />
      </div>
      <div className="w-40 shrink-0 text-right text-micro text-fg-muted">
        {width === undefined ? '…' : `${String(width)} px`}
        {token.fixed ? ' · fix' : ''}
      </div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Spacings',
  parameters: { layout: 'fullscreen' },
};

export const Scale = {
  render: () => <SpacingsScale />,
};

function SpacingsScale() {
  const widths = useMeasuredWidths();

  return (
    <div className="flex flex-col gap-6 p-8 font-sans">
      <div>
        <h2 className="mb-1 text-body-s font-bold text-fg-primary">Отступы</h2>
        <p className="max-w-3xl text-caption text-fg-secondary">
          Токены лежат в <code>tokens/spacings.css</code> и работают как обычные утилиты Tailwind:{' '}
          <code>p-s</code>, <code>gap-m</code>, <code>m-1xl</code>, <code>w-7xl</code> и так далее.
          Шкала адаптивная: до <code>desktop-s</code> (1024 px) применяется мобильное значение, от
          1024 px — десктопное. Токены с суффиксом <code>-fix</code> держат одно значение на обоих
          брейкпоинтах. <code>auto</code> не токен — отступы-auto даёт Tailwind нативно (
          <code>ml-auto</code> и т.п.). Сужайте окно — значения пересчитываются.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 text-micro font-medium tracking-wider text-fg-muted uppercase">
          Шкала — живая ширина полосы равна значению токена
        </div>
        <div className="flex flex-col gap-3">
          {spacingTokens.map((token) => (
            <SpacingRow key={token.name} token={token} width={widths[token.name]} />
          ))}
        </div>
      </div>
    </div>
  );
}
