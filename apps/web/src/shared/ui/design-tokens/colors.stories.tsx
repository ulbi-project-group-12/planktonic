import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Parses the computed `rgb()` / `rgba()` value into the mockup `#HEX rgb(...)` format. */
function formatColor(css: string | null): string {
  if (!css) return '…';
  const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(css);
  if (!match) return css;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);

  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

  const hex = [
    '#',
    toHex(r),
    toHex(g),
    toHex(b),
    alpha < 1 ? toHex(Math.round(alpha * 255)) : '',
  ].join('');
  const rgb =
    alpha < 1
      ? [
          'rgba(',
          String(r),
          ', ',
          String(g),
          ', ',
          String(b),
          ', ',
          String(Math.round(alpha * 100) / 100),
          ')',
        ].join('')
      : ['rgb(', String(r), ', ', String(g), ', ', String(b), ')'].join('');

  return [hex, ' ', rgb].join('');
}

/** Reads the rendered sample element's computed color after mount (depends on the theme). */
function ComputedColorValue({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (element) {
      setColor(getComputedStyle(element).getPropertyValue('background-color').trim());
    }
  }, [targetRef]);

  return <>{formatColor(color)}</>;
}

interface SwatchItem {
  /** CSS variable with the raw token, e.g. --brand-primary. */
  cssVar: string;
  /** Mockup token name, e.g. brand/primary. */
  name: string;
  /** Usage description from the mockup. */
  description: string;
}

function Swatch({ item }: { item: SwatchItem }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="min-w-0">
      <div
        ref={ref}
        className="h-14 rounded-xl border border-line"
        style={{ background: `var(${item.cssVar})` }}
      />
      <div className="mt-2 truncate text-caption font-bold text-fg-primary">{item.name}</div>
      <div className="mt-0.5 text-micro text-fg-secondary">
        <ComputedColorValue targetRef={ref} />
      </div>
      <div className="mt-0.5 text-micro text-fg-muted">{item.description}</div>
    </div>
  );
}

function Group({ label, items }: { label: string; items: SwatchItem[] }) {
  return (
    <div>
      <div className="text-micro font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <Swatch key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

interface Section {
  title: string;
  groups: { label: string; items: SwatchItem[] }[];
}

const sections: Section[] = [
  {
    title: 'Brand — акцент',
    groups: [
      {
        label: 'BRAND — КНОПКИ, ССЫЛКИ, АКТИВНЫЙ КАНАЛ',
        items: [
          {
            cssVar: '--brand-primary',
            name: 'brand/primary',
            description: 'кнопки, ссылки, активный канал',
          },
          { cssVar: '--brand-hover', name: 'brand/hover', description: 'hover по акценту' },
          { cssVar: '--brand-active', name: 'brand/active', description: 'нажатое состояние' },
          {
            cssVar: '--brand-subtle',
            name: 'brand/subtle',
            description: 'фон выделенного пункта, бейджи',
          },
        ],
      },
    ],
  },
  {
    title: 'Neutral — фоны, текст, бордеры',
    groups: [
      {
        label: 'ФОНЫ И ПОВЕРХНОСТИ',
        items: [
          { cssVar: '--bg-app', name: 'bg/app', description: 'фон приложения' },
          { cssVar: '--bg-surface', name: 'bg/surface', description: 'сайдбары, панели, карточки' },
          {
            cssVar: '--bg-sunken',
            name: 'bg/sunken',
            description: 'ввод, вложенные области, hover-строки',
          },
          { cssVar: '--bg-overlay', name: 'bg/overlay', description: 'подложка модалок' },
          {
            cssVar: '--border-default',
            name: 'border/default',
            description: 'разделители, обводки полей',
          },
          {
            cssVar: '--border-strong',
            name: 'border/strong',
            description: 'активные поля, DnD-зоны',
          },
        ],
      },
      {
        label: 'ТЕКСТ',
        items: [
          { cssVar: '--text-primary', name: 'text/primary', description: 'основной текст' },
          {
            cssVar: '--text-secondary',
            name: 'text/secondary',
            description: 'метаданные, вторичный текст',
          },
          {
            cssVar: '--text-muted',
            name: 'text/muted',
            description: 'время, плейсхолдеры, офлайн',
          },
          {
            cssVar: '--on-brand',
            name: 'text/on-accent',
            description: 'текст на акцентном фоне',
          },
        ],
      },
    ],
  },
];

const semanticStatuses: { name: string; usage: string; cssPrefix: string }[] = [
  { name: 'success', usage: '«Готово», delivered, online', cssPrefix: '--success' },
  { name: 'warning', usage: 'горит срок, «На проверке»', cssPrefix: '--warning' },
  { name: 'danger', usage: 'ошибки, удаление, блокировка', cssPrefix: '--danger' },
  { name: 'info', usage: 'упоминания, уведомления', cssPrefix: '--info' },
];

const semanticStates: { label: string; suffix: string }[] = [
  { label: 'BASE', suffix: '' },
  { label: 'HOVER', suffix: '-hover' },
  { label: 'ACTIVE', suffix: '-active' },
  { label: 'SUBTLE', suffix: '-subtle' },
];

function SemanticRow({ status }: { status: (typeof semanticStatuses)[number] }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-6">
      <div className="min-w-0">
        <div className="text-caption font-bold text-fg-primary">{status.name}</div>
        <div className="mt-0.5 text-micro text-fg-muted">{status.usage}</div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {semanticStates.map((state) => {
          const cssVar = `${status.cssPrefix}${state.suffix}`;
          return <SemanticSwatch key={state.label} cssVar={cssVar} label={state.label} />;
        })}
      </div>
    </div>
  );
}

function SemanticSwatch({ cssVar, label }: { cssVar: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="min-w-0">
      <div
        ref={ref}
        className="h-10 rounded-lg border border-line"
        style={{ background: `var(${cssVar})` }}
      />
      <div className="mt-1.5 text-[10px] font-medium tracking-wider text-fg-muted">{label}</div>
      <div className="text-micro text-fg-secondary">
        <ComputedColorValue targetRef={ref} />
      </div>
    </div>
  );
}

function ThemePalette({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-8 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>

        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-4 text-body-l font-bold text-fg-primary">{section.title}</h3>
              <div className="flex flex-col gap-8 rounded-xl border border-line bg-app p-6">
                {section.groups.map((group) => (
                  <Group key={group.label} label={group.label} items={group.items} />
                ))}
              </div>
            </section>
          ))}

          <section>
            <h3 className="mb-4 text-body-l font-bold text-fg-primary">
              Semantic — цвет и его состояния
            </h3>
            <div className="flex flex-col gap-8 rounded-xl border border-line bg-app p-6">
              <div className="text-micro font-medium tracking-wider text-fg-muted uppercase">
                BASE — HOVER — ACTIVE — SUBTLE
              </div>
              {semanticStatuses.map((status) => (
                <SemanticRow key={status.name} status={status} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default {
  title: 'shared/Design Tokens/Colors',
  parameters: { layout: 'fullscreen' },
};

export const Palette = {
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemePalette theme="light" />
      <ThemePalette theme="dark" />
    </div>
  ),
};
