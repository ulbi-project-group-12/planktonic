import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from './textarea';

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

function TextareaSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Состояния">
        <div className="grid max-w-3xl gap-6 desktop-s:grid-cols-2">
          <Textarea label="По умолчанию" placeholder="Расскажите о проекте…" />
          <Textarea label="Заполненное" defaultValue={'Многострочный текст.\nВторой абзац.'} />
          <Textarea
            label="С подсказкой"
            placeholder="Коротко, 2–3 предложения"
            hint="Подсказка под полем, 12 px muted"
          />
          <Textarea
            label="Ошибка"
            placeholder="user@example.com"
            status="error"
            message="Текст слишком короткий"
          />
          <Textarea
            label="Успех"
            defaultValue="Всё заполнено верно"
            status="success"
            message="Проверено"
          />
          <Textarea label="Отключённое" placeholder="Недоступно" disabled />
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        Геометрия как у Input: radius 10 · text 14/400 · высота тянется за контентом (min-height 96)
        · ошибка/успех — цветная рамка и сообщение · отключено — sunken + muted
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — многострочное поле</h3>
        <TextareaSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Textarea',
  component: Textarea,
} satisfies Meta<typeof Textarea>;

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
    label: 'Описание',
    placeholder: 'Введите текст…',
    hint: '',
    status: 'default',
    message: '',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    status: { control: 'select', options: ['default', 'error', 'success'] },
    message: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};
