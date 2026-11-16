import type { ReactNode } from 'react';
import {
  Typography,
  typographyColors,
  typographySizes,
  typographyWeights,
  type TypographySize,
  type TypographyWeight,
} from './typography';

const weights: { weight: TypographyWeight; description: string }[] = [
  {
    weight: '200',
    description: '200 ExtraLight — декоративные акценты, большие числа, пустые состояния',
  },
  {
    weight: '400',
    description: '400 Regular — весь интерфейс и сообщения, основная толщина',
  },
  {
    weight: '700',
    description: '700 Bold — заголовки h1–h6, авторы сообщений, ключевые цифры',
  },
];

const headings: {
  meta: string;
  size: TypographySize;
  tracking: string;
  sample: string;
}[] = [
  {
    meta: 'h1 — 40/48 → 28/36 — −0.02em',
    size: 'h1',
    tracking: 'tracking-[-0.02em]',
    sample: 'Заголовок h1',
  },
  {
    meta: 'h2 — 32/40 → 24/32 — −0.015em',
    size: 'h2',
    tracking: 'tracking-[-0.015em]',
    sample: 'Заголовок h2',
  },
  {
    meta: 'h3 — 28/36 → 20/28 — −0.01em',
    size: 'h3',
    tracking: 'tracking-[-0.01em]',
    sample: 'Заголовок h3',
  },
  {
    meta: 'h4 — 24/32 → 18/26 — −0.005em',
    size: 'h4',
    tracking: 'tracking-[-0.005em]',
    sample: 'Заголовок h4',
  },
  {
    meta: 'h5 — 20/28 → 16/24 — 0',
    size: 'h5',
    tracking: 'tracking-normal',
    sample: 'Заголовок h5',
  },
  {
    meta: 'h6 — 16/24 → 14/20 — 0.01em',
    size: 'h6',
    tracking: 'tracking-[0.01em]',
    sample: 'Заголовок h6',
  },
];

const bodyTexts: {
  meta: string;
  size: TypographySize;
  tracking: string;
  sample: string;
}[] = [
  {
    meta: 'text/xs — 12/16 — 0.01em',
    size: 'caption',
    tracking: 'tracking-[0.01em]',
    sample: '12:48 — сообщение отредактировано — было изменено вами',
  },
  {
    meta: 'text/s — 14/20 — 0',
    size: 'body-s',
    tracking: 'tracking-normal',
    sample: 'Основной текст интерфейса и сообщений. Реакция 👍 3 — ветка «Деплой падает»',
  },
  {
    meta: 'text/m — 16/24 (22 mob)',
    size: 'body',
    tracking: 'tracking-normal',
    sample: 'Описание задачи, поле ввода, абзацы описаний. Проверь PL-42 — там обновился статус.',
  },
  {
    meta: 'text/l — 18/26 (24 mob)',
    size: 'body-l',
    tracking: 'tracking-normal',
    sample: 'Лид-абзацы и описания карточек задач. Используем pnpm dlx prisma migrate dev',
  },
  {
    meta: 'text/xl — 20/28',
    size: 'body-xl',
    tracking: 'tracking-normal',
    sample: 'Крупные описания и пустые состояния: «Здесь появятся сообщения канала».',
  },
];

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

function SpecRow({ meta, children }: { meta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[280px_1fr] items-baseline gap-6 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="text-micro whitespace-nowrap text-fg-muted">{meta}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TypeScale() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Начертания">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {weights.map((item) => (
            <div key={item.weight} className="min-w-0">
              <Typography as="div" size="h1" weight={item.weight} color="text-muted">
                Aa
              </Typography>
              <Typography as="p" size="body-l" weight={item.weight} className="mt-2">
                Обсуждения, задачи и код — в одном месте
              </Typography>
              <p className="mt-2 text-micro text-fg-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card label="Заголовки — всегда 700 — desktop → mobile от 1023px">
        <div className="flex flex-col">
          {headings.map((item) => (
            <SpecRow key={item.meta} meta={item.meta}>
              <Typography as="div" size={item.size} weight="700" className={item.tracking}>
                {item.sample}
              </Typography>
            </SpecRow>
          ))}
        </div>
      </Card>

      <Card label="Текст — xs → xl">
        <div className="flex flex-col">
          {bodyTexts.map((item) => (
            <SpecRow key={item.meta} meta={item.meta}>
              <Typography as="p" size={item.size} className={item.tracking}>
                {item.sample}
              </Typography>
            </SpecRow>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">
          Типографика — Onest (200 / 400 / 700)
        </h3>
        <TypeScale />
      </div>
    </div>
  );
}

export default {
  title: 'shared/Atoms/Typography',
  component: Typography,
};

export const TypeScaleStory = {
  name: 'Type Scale',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemeBlock theme="light" />
      <ThemeBlock theme="dark" />
    </div>
  ),
};

export const Playground = {
  args: {
    children: 'Планктон — основа пищевой цепи',
    size: 'caption',
    color: 'text-primary',
    weight: '400',
  },
  argTypes: {
    size: { control: 'select', options: typographySizes },
    color: { control: 'select', options: typographyColors },
    weight: { control: 'select', options: typographyWeights },
  },
};
