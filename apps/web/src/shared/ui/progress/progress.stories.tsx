import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from './progress';

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — прогресс</h3>
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">
              Загрузка файла
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-fg-secondary">Загрузка файла — 60%</span>
                <Progress value={60} aria-label="Загрузка файла" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-fg-secondary">Начало — 8%</span>
                <Progress value={8} aria-label="Начало загрузки" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-fg-secondary">Почти готово — 92%</span>
                <Progress value={92} aria-label="Почти готово" />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-fg-muted">трек sunken · заливка brand · radius full</p>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Progress',
  component: Progress,
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { value: 60 },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col gap-10 bg-app p-8 font-sans">
      <ThemeBlock theme="light" />
      <ThemeBlock theme="dark" />
    </div>
  ),
};

export const Playground: Story = {
  args: { value: 60 },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  render: (args) => (
    <div className="flex flex-col gap-2 p-10">
      <span className="text-xs text-fg-secondary">Загрузка файла — {args.value}%</span>
      <Progress {...args} aria-label="Загрузка файла" />
    </div>
  ),
};
