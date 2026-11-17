import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Bold, Italic, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Separator, separatorTones } from './separator';

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

function Row({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <div>
        <div className="text-body-s font-bold text-fg-primary">{name}</div>
        <div className="text-caption text-fg-muted">{note}</div>
      </div>
      {children}
    </div>
  );
}

function HorizontalSpec() {
  return (
    <Card label="Separator · горизонтальный">
      <div className="flex flex-col gap-6">
        <Row name="По умолчанию" note="border.default · 1px">
          <Separator />
        </Row>
        <Row name="Сильный" note="border.strong · 1px">
          <Separator tone="strong" />
        </Row>
        <Row name="Толстый" note="border.default · 2px">
          <Separator tone="thick" />
        </Row>
        <Row name="Брендовый" note="brand.primary · 2px">
          <Separator tone="brand" />
        </Row>
      </div>
    </Card>
  );
}

function VerticalSpec() {
  return (
    <Card label="Separator · вертикальный">
      <div className="flex flex-col gap-6">
        <Row name="В тулбаре" note="между группами действий">
          <div className="flex w-fit items-center gap-1 rounded-lg border border-line bg-surface p-1">
            <Button size="s" variant="secondary" aria-label="Жирный">
              <Bold className="size-3.5" />
            </Button>
            <Button size="s" variant="secondary" aria-label="Курсив">
              <Italic className="size-3.5" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button size="s" variant="secondary" aria-label="Вставить ссылку">
              <LinkIcon className="size-3.5" />
            </Button>
          </div>
        </Row>
        <Row name="В меню" note="между группами пунктов">
          <div className="w-56 rounded-lg border border-line bg-surface p-1">
            <div className="flex h-7 items-center gap-2 rounded-md px-2 text-caption text-fg-primary">
              <Pencil className="size-3.5 text-fg-muted" />
              Редактировать
            </div>
            <Separator className="my-1" />
            <div className="flex h-7 items-center gap-2 rounded-md px-2 text-caption text-danger">
              <Trash2 className="size-3.5" />
              Удалить
            </div>
          </div>
        </Row>
      </div>
    </Card>
  );
}

function LabeledSpec() {
  return (
    <Card label="Separator · с подписью">
      <div className="flex flex-col gap-6">
        <Row name="Текст по центру" note="«или» между половинами">
          <Separator>или</Separator>
        </Row>
        <Row name="Дата в ленте" note="группировка сообщений">
          <Separator>12 ноября</Separator>
        </Row>
        <Row name="Секция" note="верхний регистр">
          <Separator section>Новые</Separator>
        </Row>
      </div>
    </Card>
  );
}

function SeparatorSpec() {
  return (
    <div className="flex flex-col gap-6">
      <HorizontalSpec />
      <VerticalSpec />
      <LabeledSpec />
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — разделитель</h3>
        <SeparatorSpec />
        <p className="mt-6 text-[11px] text-fg-muted">
          Горизонтальный и вертикальный, с подписью, оттенки
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
  args: {},
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemeBlock theme="light" />
      <ThemeBlock theme="dark" />
    </div>
  ),
};

export const Playground: Story = {
  args: {
    orientation: 'horizontal',
    tone: 'default',
    children: 'или',
    section: false,
    className: 'w-72',
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    tone: { control: 'select', options: separatorTones },
    children: { control: 'text' },
    section: { control: 'boolean' },
    className: { control: 'text' },
  },
};
