import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Switch } from './switch';

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

function SwitchSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Состояния">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          <Switch label="Выключен" />
          <Switch defaultChecked label="Включён" />
          <Switch disabled label="Отключён" />
          <Switch defaultChecked disabled label="Включён · отключён" />
        </div>
      </Card>
      <Card label="Без подписи — с aria-label">
        <div className="flex items-center gap-8">
          <Switch aria-label="Уведомления" />
          <Switch defaultChecked aria-label="Уведомления" />
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        Трек 40 × 24 · knob 20, inset 2 · включён — brand без рамки, выключен — bg/sunken +
        border/default · фокус — кольцо brand/40 · отключён — opacity 45%
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — свитчеры</h3>
        <SwitchSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

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
    defaultChecked: false,
    label: 'Уведомления',
    disabled: false,
  },
  argTypes: {
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
