import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge, badgeVariants, type BadgeVariant } from './badge';

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

const semanticVariants: BadgeVariant[] = ['success', 'danger', 'warning', 'info'];

function BadgeSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Типы">
        <Row label="Счётчик" caption="h 20 · radius full">
          <Badge count={3} />
          <Badge count={12} variant="success" />
          <Badge count={5} variant="danger" />
          <Badge count={1} variant="warning" />
        </Row>
        <Row label="Переполнение" caption="99+ сверх лимита">
          <Badge count={128} />
          <Badge count={256} variant="warning" />
          <Badge count={100} variant="muted" />
        </Row>
        <Row label="Упоминание" caption="@ + число">
          <Badge count={1} mention variant="danger" />
          <Badge count={4} mention />
          <Badge count={12} mention variant="info" />
        </Row>
        <Row label="Dot" caption="8 px без числа">
          {badgeVariants.map((variant) => (
            <Badge key={variant} dot variant={variant} />
          ))}
        </Row>
      </Card>
      <Card label="Семантика">
        <div className="flex flex-wrap items-center gap-2">
          {semanticVariants.map((variant) => (
            <Badge key={variant} count={12} variant={variant} />
          ))}
          <Badge count={7} variant="muted" />
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        на аватаре — кольцо surface 2 px (пример: обернуть бейдж absolute -right-0.5 -bottom-0.5
        ring-2 ring-surface)
      </p>
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — бейджи</h3>
        <BadgeSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Badge',
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
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
    count: 3,
    mention: false,
    dot: false,
    variant: 'brand',
  },
  argTypes: {
    count: { control: 'number' },
    mention: { control: 'boolean' },
    dot: { control: 'boolean' },
    variant: { control: 'select', options: badgeVariants },
  },
};
