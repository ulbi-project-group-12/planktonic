import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Chip, chipPalettes, type ChipPalette } from './chip';

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

function Row({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-caption font-bold text-fg-primary">{label}</div>
        <div className="text-[11px] text-fg-muted">{caption}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const semanticPalettes: ChipPalette[] = ['success', 'warning', 'danger', 'info'];

function ChipSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Статус задачи">
        <Row label="Статусы" caption="h 24 · radius full">
          <Chip fill="neutral">Нужно сделать</Chip>
          <Chip dot palette="info">
            В работе
          </Chip>
          <Chip fill="solid" palette="success">
            Готово
          </Chip>
          <Chip palette="warning" onRemove={fn()}>
            На проверке
          </Chip>
        </Row>
      </Card>
      <Card label="Приоритет">
        <Row label="Низкий · критичный" caption="нейтральный и критичный приоритеты">
          <Chip fill="neutral">Низкий</Chip>
          <Chip dot palette="warning">
            Средний
          </Chip>
          <Chip fill="solid" palette="danger">
            Критичный
          </Chip>
          <Chip palette="danger" onRemove={fn()}>
            Высокий
          </Chip>
        </Row>
      </Card>
      <Card label="Упоминание">
        <Row label="Канал · юзер · задача" caption="@user · #channel · задача">
          <Chip fill="neutral">#general</Chip>
          <Chip dot palette="brand">
            @maria
          </Chip>
          <Chip fill="solid" palette="brand">
            PL-42
          </Chip>
          <Chip palette="info" onRemove={fn()}>
            @alexandr
          </Chip>
        </Row>
      </Card>
      <Card label="Мультиселект">
        <Row label="Значения в поле" caption="съёмные значения с крестиком">
          <Chip fill="neutral" onRemove={fn()}>
            Результат CI
          </Chip>
          <Chip dot palette="info" onRemove={fn()}>
            PR открыт
          </Chip>
          <Chip fill="neutral">Merge</Chip>
          <Chip palette="brand" onRemove={fn()}>
            Push в main
          </Chip>
        </Row>
      </Card>
      <Card label="Семантика">
        <div className="flex flex-wrap items-center gap-2">
          {semanticPalettes.map((palette) => (
            <Chip key={palette} dot palette={palette}>
              {palette}
            </Chip>
          ))}
          <Chip dot palette="brand">
            brand
          </Chip>
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — чипсы</h3>
        <ChipSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Chip',
  component: Chip,
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
  args: { children: 'Чип' },
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
    children: 'PL-42',
    palette: 'brand',
    fill: 'subtle',
    dot: false,
    onRemove: fn(),
  },
  argTypes: {
    palette: { control: 'select', options: chipPalettes },
    fill: { control: 'select', options: ['neutral', 'subtle', 'solid'] },
    dot: { control: 'boolean' },
  },
};
