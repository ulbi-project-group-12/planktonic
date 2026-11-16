import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Select, type SelectOption } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Field } from './field';

const roleOptions: SelectOption[] = [
  { value: 'dev', label: 'Разработка' },
  { value: 'design', label: 'Дизайн' },
  { value: 'manage', label: 'Менеджмент' },
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

function FieldSpec({ portalContainer }: { portalContainer: HTMLElement | null }) {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Подсказка и ошибка">
        <div className="grid max-w-3xl gap-6 desktop-s:grid-cols-2">
          <Field label="Email" hint="Мы не передаём адрес третьим лицам">
            <Input type="email" placeholder="user@example.com" />
          </Field>
          <Field label="Email" error="Этот адрес уже занят">
            <Input type="email" placeholder="user@example.com" status="error" />
          </Field>
        </div>
      </Card>
      <Card label="Обязательность и разные контролы">
        <div className="grid max-w-3xl gap-6 desktop-s:grid-cols-2">
          <Field label="Имя" required>
            <Input placeholder="Как к вам обращаться" />
          </Field>
          <Field label="Направление" hint="Покажем подходящие шаблоны">
            <Select
              options={roleOptions}
              value={['dev']}
              onValueChange={fn()}
              portalContainer={portalContainer}
            />
          </Field>
          <Field label="Принимаю условия" hint="Клик по подписи тоже переключает">
            <Checkbox aria-label="Принимаю условия" />
          </Field>
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        Подпись связана с полем через htmlFor · подсказка и ошибка — через aria-describedby · ошибка
        ставит aria-invalid · id поля генерируется сам, если не задан
      </p>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  // The select dropdown portal renders in body — outside the .dark wrapper, so we pass the
  // themed container explicitly so the dropdown inherits the block theme tokens.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);

  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div ref={containerRef} className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — поле формы</h3>
        <FieldSpec portalContainer={portalContainer} />
      </div>
    </div>
  );
}

function SignupForm() {
  const [agree, setAgree] = useState(false);
  const [role, setRole] = useState<string[]>([]);

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
      <h3 className="mb-1 text-body-l font-bold text-fg-primary">Регистрация</h3>
      <p className="mb-6 text-caption text-fg-secondary">
        Пример связки Field + Input + Textarea + Select + Checkbox + Button
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Field label="Имя" required>
          <Input placeholder="Как к вам обращаться" autoComplete="name" />
        </Field>
        <Field label="Email" required error="Этот адрес уже занят">
          <Input type="email" placeholder="user@example.com" status="error" autoComplete="email" />
        </Field>
        <Field label="Пароль" required hint="Минимум 8 символов">
          <Input type="password" placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <Field label="О себе">
          <Textarea placeholder="Пара слов о вашем опыте (необязательно)" />
        </Field>
        <Field label="Направление">
          <Select
            options={roleOptions}
            value={role}
            onValueChange={setRole}
            placeholder="Выберите…"
          />
        </Field>
        <Field>
          <Checkbox
            checked={agree}
            onCheckedChange={setAgree}
            label="Принимаю условия использования"
          />
        </Field>
        <Button type="submit" className="mt-2" loading={false}>
          Создать аккаунт
        </Button>
      </form>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Field',
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  parameters: { layout: 'fullscreen' },
  args: { label: 'Email', children: <Input /> },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemeBlock theme="light" />
      <ThemeBlock theme="dark" />
    </div>
  ),
};

export const Form: Story = {
  parameters: { layout: 'fullscreen' },
  args: { label: 'Email', children: <Input /> },
  render: () => (
    <div className="flex min-h-svh flex-col gap-10 bg-app p-8 font-sans">
      <div>
        <SignupForm />
      </div>
      <div className="dark">
        <SignupForm />
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    label: 'Email',
    hint: '',
    error: '',
    required: false,
    children: <Input placeholder="user@example.com" />,
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    required: { control: 'boolean' },
    children: { control: false },
  },
};
