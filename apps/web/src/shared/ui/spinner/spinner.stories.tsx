import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/ui/button';
import { Spinner, spinnerSizes, type SpinnerSize } from './spinner';

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  const label: Record<SpinnerSize, string> = {
    s: '16 — инлайн в тексте',
    m: '20 — кнопки',
    l: '24 — карточки',
    xl: '32 — страницы',
  };

  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-6 text-base font-bold text-fg-primary">
          {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </h2>
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — спиннер</h3>
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Размеры — spin 0.8 s linear
            </div>
            <div className="flex flex-wrap items-center gap-10">
              {spinnerSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Spinner size={size} />
                  <span className="text-[11px] text-fg-muted">{label[size]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              В кнопке — «Отправка…»
            </div>
            <Button disabled>
              <Spinner size="s" />
              Отправка…
            </Button>
          </div>
          <p className="text-[11px] text-fg-muted">
            ИИ-генерация — spin 1.2 s (замедленный, через className)
          </p>
          <Spinner className="animate-[spin_1.2s_linear_infinite]" size="l" />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Spinner',
  component: Spinner,
} satisfies Meta<typeof Spinner>;

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
  args: { size: 'm' },
  argTypes: {
    size: { control: 'select', options: spinnerSizes },
  },
};
