import * as React from 'react';

/** A single design token shown as a swatch with its mockup name and current value. */
function TokenCard({
  name,
  utility,
  children,
  value,
}: {
  name: string;
  utility?: string;
  children: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {children}
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{name}</div>
        <div className="truncate text-xs text-fg-muted">
          {utility ? `${utility} · ` : ''}
          {value}
        </div>
      </div>
    </div>
  );
}

/** Reads a computed CSS value from the element in ref after mount (theme-aware). */
function ComputedValue({
  targetRef,
  property,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  property: string;
}) {
  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    const element = targetRef.current;
    if (element) setValue(getComputedStyle(element).getPropertyValue(property).trim());
  }, [targetRef, property]);

  return <>{value || '…'}</>;
}

const swatchRefGroups: {
  title: string;
  note?: string;
  items: [name: string, utility: string, cssVar: string][];
}[] = [
  {
    title: 'Brand',
    items: [
      ['brand.primary', 'brand-primary', '--brand-primary'],
      ['brand.hover', 'brand-hover', '--brand-hover'],
      ['brand.active', 'brand-active', '--brand-active'],
      ['brand.subtle', 'brand-subtle', '--brand-subtle'],
    ],
  },
  {
    title: 'Surfaces',
    note: 'bg.* в макете',
    items: [
      ['bg.app', 'app', '--bg-app'],
      ['bg.surface', 'surface', '--bg-surface'],
      ['bg.sunken', 'sunken', '--bg-sunken'],
      ['bg.overlay', 'overlay', '--bg-overlay'],
    ],
  },
  {
    title: 'Text',
    note: 'text.* в макете',
    items: [
      ['text.primary', 'fg-primary', '--text-primary'],
      ['text.secondary', 'fg-secondary', '--text-secondary'],
      ['text.muted', 'fg-muted', '--text-muted'],
    ],
  },
  {
    title: 'Borders',
    note: 'border.* в макете',
    items: [
      ['border.default', 'line', '--border-default'],
      ['border.strong', 'line-strong', '--border-strong'],
    ],
  },
  {
    title: 'Semantic',
    items: [
      ['success', 'success', '--success'],
      ['success.hover', 'success-hover', '--success-hover'],
      ['success.active', 'success-active', '--success-active'],
      ['success.subtle', 'success-subtle', '--success-subtle'],
      ['warning', 'warning', '--warning'],
      ['warning.hover', 'warning-hover', '--warning-hover'],
      ['warning.active', 'warning-active', '--warning-active'],
      ['warning.subtle', 'warning-subtle', '--warning-subtle'],
      ['danger', 'danger', '--danger'],
      ['danger.hover', 'danger-hover', '--danger-hover'],
      ['danger.active', 'danger-active', '--danger-active'],
      ['danger.subtle', 'danger-subtle', '--danger-subtle'],
      ['info', 'info', '--info'],
      ['info.hover', 'info-hover', '--info-hover'],
      ['info.active', 'info-active', '--info-active'],
      ['info.subtle', 'info-subtle', '--info-subtle'],
    ],
  },
];

function ColorSwatch({ name, utility, cssVar }: { name: string; utility: string; cssVar: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  return (
    <TokenCard
      name={name}
      utility={`bg-${utility} / text-${utility} / border-${utility}`}
      value={<ComputedValue targetRef={ref} property="background-color" />}
    >
      <div
        ref={ref}
        className="size-12 shrink-0 rounded-lg border border-line"
        style={{ background: `var(${cssVar})` }}
      />
    </TokenCard>
  );
}

export default {
  title: 'shared/Design Tokens/Colors',
  parameters: { layout: 'fullscreen' },
};

export const Palette = {
  render: () => (
    <div className="flex flex-col gap-10 p-8 font-sans">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={theme === 'dark' ? 'dark' : undefined}>
          <div
            className="rounded-2xl border border-line p-6"
            style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
          >
            <h2 className="mb-1 text-lg font-bold">
              {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
            </h2>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Значения переключаются классом <code>.dark</code> на контейнере.
            </p>
            <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
              {swatchRefGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-3 text-sm font-bold tracking-wide uppercase">
                    {group.title}
                    {group.note ? (
                      <span className="ml-2 font-normal normal-case text-fg-muted">
                        {group.note}
                      </span>
                    ) : null}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {group.items.map(([name, utility, cssVar]) => (
                      <ColorSwatch key={name} name={name} utility={utility} cssVar={cssVar} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};
