import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Checkbox } from './checkbox';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function CheckboxSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Состояния">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          <Checkbox label="По умолчанию" />
          <Checkbox defaultChecked label="Отмечен" />
          <Checkbox disabled label="Отключён" />
          <Checkbox defaultChecked disabled label="Отмечен · отключён" />
        </div>
      </Card>
      <Card label="Без подписи — с aria-label">
        <div className="flex items-center gap-8">
          <Checkbox aria-label="Принимаю условия" />
          <Checkbox defaultChecked aria-label="Принимаю условия" />
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        Бокс 20 × 20 · radius/s 4 · отметка — Check 14 на brand · фокус — кольцо brand/40 · отключён
        — opacity 45%
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
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — чекбоксы</h3>
        <CheckboxSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Checkbox',
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
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
    defaultChecked: false,
    label: 'Принимаю условия',
    disabled: false,
  },
  argTypes: {
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
