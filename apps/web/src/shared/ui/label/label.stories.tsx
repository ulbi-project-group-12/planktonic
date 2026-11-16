import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '@/shared/ui/input';
import { Label } from './label';

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

function LabelSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Состояния">
        <div className="grid max-w-2xl grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="label-default">По умолчанию</Label>
            <Input id="label-default" placeholder="Введите email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="label-required" required>
              Обязательное
            </Label>
            <Input id="label-required" placeholder="Введите пароль" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="label-disabled" disabled>
              Отключённое поле
            </Label>
            <Input id="label-disabled" placeholder="Недоступно" disabled />
          </div>
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        Подпись 13/700 · клик по подписи фокусирует поле (htmlFor) · * — маркер обязательности ·
        отключено — muted
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — подписи</h3>
        <LabelSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Label',
  component: Label,
} satisfies Meta<typeof Label>;

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
    children: 'Email',
    required: false,
    disabled: false,
  },
  argTypes: {
    children: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    htmlFor: { control: false },
  },
};
