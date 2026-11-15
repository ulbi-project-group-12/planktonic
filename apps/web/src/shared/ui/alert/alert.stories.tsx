import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Alert, alertPalettes, type AlertPalette } from './alert';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

const rows: { palette: AlertPalette; title: string; description?: string; action?: string }[] = [
  {
    palette: 'success',
    title: 'Задача создана',
    description: 'PL-42 в колонке «Нужно сделать»',
    action: 'Открыть PL-42',
  },
  {
    palette: 'warning',
    title: 'Срок завтра',
    description: 'PL-22 нужно сдать до 18:00',
    action: 'Перенести срок',
  },
  {
    palette: 'danger',
    title: 'Не отправлено',
    description: 'Проверьте соединение с сетью',
    action: 'Повторить',
  },
  {
    palette: 'info',
    title: 'PR ждёт ревью',
    description: 'fix/auth-refresh открыт 2 часа назад',
    action: 'Перейти к PR',
  },
];

function AlertSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Базовый — иконка + заголовок">
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <Alert key={row.palette} palette={row.palette} title={row.title} />
          ))}
        </div>
      </Card>
      <Card label="С описанием и действием — состояния строк из макета">
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <Alert
              key={row.palette}
              palette={row.palette}
              title={row.title}
              description={row.description}
              action={{ label: row.action ?? '' }}
            />
          ))}
        </div>
      </Card>
      <Card label="Закрываемый — крестик справа">
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <Alert key={row.palette} palette={row.palette} title={row.title} closable />
          ))}
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        fill: {'{pal}'}.subtle · обводка и заголовок в цвете палитры · описание — fg.secondary ·
        действие — ссылка в цвете палитры
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
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — алерты</h3>
        <AlertSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Alert',
  component: Alert,
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { title: '', description: '' },
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
    palette: 'success',
    title: 'Задача создана',
    description: 'PL-42 в колонке «Нужно сделать»',
    action: { label: 'Открыть PL-42' },
    closable: false,
  },
  argTypes: {
    palette: { control: 'select', options: alertPalettes },
    closable: { control: 'boolean' },
  },
};
