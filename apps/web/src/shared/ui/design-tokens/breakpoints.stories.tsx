import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';

interface BreakpointToken {
  /** Token name and the same-named Tailwind variant (mobile-s:, desktop-s: …). */
  name: string;
  /** CSS variable from tokens/breakpoints.css. */
  cssVar: string;
  px: number;
  /** What it is used for. */
  usage: string;
}

const breakpointTokens: BreakpointToken[] = [
  {
    name: 'mobile-s',
    cssVar: '--breakpoint-mobile-s',
    px: 320,
    usage: 'минимальная ширина мобильного',
  },
  { name: 'mobile-m', cssVar: '--breakpoint-mobile-m', px: 360, usage: 'базовый телефон' },
  { name: 'mobile-l', cssVar: '--breakpoint-mobile-l', px: 540, usage: 'крупный телефон' },
  { name: 'mobile-xl', cssVar: '--breakpoint-mobile-xl', px: 768, usage: 'планшет' },
  {
    name: 'desktop-s',
    cssVar: '--breakpoint-desktop-s',
    px: 1024,
    usage: 'граница: мобильный → десктоп',
  },
  { name: 'desktop-m', cssVar: '--breakpoint-desktop-m', px: 1280, usage: 'ноутбук' },
  { name: 'desktop-l', cssVar: '--breakpoint-desktop-l', px: 1440, usage: 'широкий монитор' },
];

const DESKTOP_L = 1440;

/** Current preview iframe width, updated on resize. */
function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return width;
}

/** The largest token already reached by the current width (mobile-first). */
function activeToken(width: number): BreakpointToken {
  const matched = [...breakpointTokens].reverse().find((token) => width >= token.px);
  if (matched) return matched;
  const fallback = breakpointTokens[0];
  if (!fallback) throw new Error('Список breakpointTokens пуст');
  return fallback;
}

function BreakpointRow({ token, width }: { token: BreakpointToken; width: number }) {
  const isActive = width >= token.px;
  const isBoundary = token.name === 'desktop-s';

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 shrink-0">
        <div className="text-caption font-bold text-fg-primary">
          {token.name}
          {isActive ? (
            <span className="ml-2 text-micro font-bold text-success">активен</span>
          ) : null}
        </div>
        <div className="text-micro text-fg-muted">{token.px} px</div>
      </div>
      <div className="relative h-8 flex-1">
        <div className="absolute inset-0 rounded-md bg-sunken" />
        <div
          className={
            isBoundary
              ? 'absolute top-0 left-0 flex h-full items-center rounded-md bg-brand-subtle pl-2 text-micro font-bold text-brand-text'
              : 'absolute top-0 left-0 flex h-full items-center rounded-md bg-brand-primary/25 pl-2 text-micro font-bold text-fg-primary'
          }
          style={{ width: `${String((token.px / DESKTOP_L) * 100)}%` }}
        >
          {token.name}:
        </div>
      </div>
      <div className="hidden w-56 shrink-0 text-micro text-fg-muted sm:block">{token.usage}</div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Breakpoints',
  parameters: { layout: 'fullscreen' },
};

export const Scale = {
  render: () => <BreakpointsScale />,
};

function BreakpointsScale() {
  const width = useViewportWidth();
  const active = activeToken(width);
  const demoRef = useRef<HTMLDivElement>(null);
  const [demoHeight, setDemoHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = demoRef.current;
    if (!element) return;
    const update = () => {
      setDemoHeight(element.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-8 font-sans">
      <div>
        <h2 className="mb-1 text-body-s font-bold text-fg-primary">Брейкпоинты</h2>
        <p className="max-w-3xl text-caption text-fg-secondary">
          Токены лежат в <code>tokens/breakpoints.css</code> и генерируют одноимённые варианты
          Tailwind: <code>mobile-s:</code>, <code>mobile-m:</code>, <code>mobile-l:</code>,{' '}
          <code>mobile-xl:</code>, <code>desktop-s:</code>, <code>desktop-m:</code>,{' '}
          <code>desktop-l:</code> (и <code>max-…:</code> для «до»). Правило проекта: мобильная
          версия — всё до 1023 px, десктоп — от <code>desktop-s</code> (1024 px). CSS-переменные
          нельзя подставить в условие @media — в обычном CSS используйте эти же значения.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 text-micro font-medium tracking-wider text-fg-muted uppercase">
          Текущая ширина viewport: {width} px · активен токен «{active.name}»
        </div>
        <div className="flex flex-col gap-3">
          {breakpointTokens.map((token) => (
            <BreakpointRow key={token.name} token={token} width={width} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 text-micro font-medium tracking-wider text-fg-muted uppercase">
          Применение — кнопка меняет высоту на desktop-s (1024 px)
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div ref={demoRef} className="w-fit">
            <Button size="m">Кнопка M</Button>
          </div>
          <span className="text-caption text-fg-secondary">
            сейчас высота {demoHeight ?? '…'} px (
            {width >= 1024 ? 'десктоп, h-10' : 'мобильная, h-9'})
          </span>
        </div>
        <p className="mt-4 text-micro text-fg-muted">
          Размеры кнопок mobile-first: S 32→36, M 36→40, L 40→44, icon 36→40. Сужайте и расширяйте
          окно — надпись и высота пересчитываются.
        </p>
      </div>
    </div>
  );
}
