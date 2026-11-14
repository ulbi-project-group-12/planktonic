import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Typography, typographyColors, typographySizes, typographyWeights } from './typography';

const sizePx: Record<(typeof typographySizes)[number], string> = {
  '2xs': '10px',
  xs: '11px',
  sm: '12px',
  md: '13px',
  lg: '14px',
  xl: '15px',
  '2xl': '16px',
  '3xl': '18px',
  '4xl': '20px',
  '5xl': '24px',
  '6xl': '28px',
  '7xl': '32px',
  '8xl': '40px',
  '9xl': '64px',
};

/** Sample + caption with the design tokens it uses (size in px, color, weight). */
function Spec({ tokens, children }: { tokens: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line/60 py-1.5">
      <div className="min-w-0">{children}</div>
      <code className="shrink-0 text-2xs whitespace-nowrap text-fg-muted">{tokens}</code>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Typography',
  component: Typography,
  args: {
    children: 'Планктон — основа пищевой цепи',
    size: 'sm',
    color: 'fg-primary',
    weight: '400',
  },
  argTypes: {
    size: { control: 'select', options: typographySizes },
    color: { control: 'select', options: typographyColors },
    weight: { control: 'inline-radio', options: typographyWeights },
    as: {
      control: 'select',
      options: ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'label', 'li'],
    },
  },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const size = args.size ?? 'sm';
    const color = args.color ?? 'fg-primary';
    const weight = args.weight ?? '400';
    return (
      <Spec tokens={`size: ${size} · ${sizePx[size]} — color: ${color} — weight: ${weight}`}>
        <Typography {...args} />
      </Spec>
    );
  },
};

export const Title: Story = {
  args: { as: 'h2', size: '6xl', weight: '700', children: 'Настройки проекта' },
  render: (args) => {
    const size = args.size ?? 'sm';
    const weight = args.weight ?? '400';
    return (
      <Spec tokens={`size: ${size} · ${sizePx[size]} — weight: ${weight}`}>
        <Typography {...args} />
      </Spec>
    );
  },
};

export const Caption: Story = {
  args: { size: 'xs', color: 'fg-muted', children: 'Последнее изменение: сегодня, 12:40' },
  render: (args) => {
    const size = args.size ?? 'sm';
    const color = args.color ?? 'fg-primary';
    return (
      <Spec tokens={`size: ${size} · ${sizePx[size]} — color: ${color}`}>
        <Typography {...args} />
      </Spec>
    );
  },
};

export const ThinDisplay: Story = {
  args: { as: 'h2', size: '7xl', weight: '200', children: 'Добро пожаловать, Александр!' },
  render: (args) => {
    const size = args.size ?? 'sm';
    const weight = args.weight ?? '400';
    return (
      <Spec tokens={`size: ${size} · ${sizePx[size]} — weight: ${weight}`}>
        <Typography {...args} />
      </Spec>
    );
  },
};

export const OnBrand: Story = {
  render: (args) => (
    <Spec tokens="size: lg · 14px — color: on-brand — weight: 700">
      <div className="rounded-lg bg-brand-primary px-4 py-2">
        <Typography {...args} color="on-brand" size="lg" weight="700" />
      </div>
    </Spec>
  ),
};

/** Светлая и тёмная темы рядом: размеры × цвета × толщина, у каждого примера — его токены. */
export const Themes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={theme === 'dark' ? 'dark' : undefined}>
          <div
            className="rounded-2xl border border-line p-6"
            style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
          >
            <Typography as="h3" size="xs" color="fg-muted" className="mb-4 uppercase">
              {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
            </Typography>
            <div className="flex flex-col">
              <Spec tokens="size: 7xl · 32px — weight: 200">
                <Typography as="p" size="7xl" weight="200">
                  Добро пожаловать, Александр!
                </Typography>
              </Spec>
              <Spec tokens="size: 6xl · 28px — weight: 700">
                <Typography as="p" size="6xl" weight="700">
                  Настройки проекта
                </Typography>
              </Spec>
              <Spec tokens="size: lg · 14px — color: fg-secondary">
                <Typography as="p" size="lg" color="fg-secondary">
                  Веб-клиент мессенджера: каналы, задачи, GitHub-интеграция
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — weight: 400">
                <Typography as="p" size="sm">
                  Основной текст интерфейса — двенадцать пикселей, вес 400.
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — color: brand-primary — weight: 700">
                <Typography as="p" size="sm" color="brand-primary" weight="700">
                  Подключить репозиторий
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — color: success">
                <Typography as="p" size="sm" color="success">
                  Задача создана
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — color: warning">
                <Typography as="p" size="sm" color="warning">
                  Срок завтра
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — color: danger">
                <Typography as="p" size="sm" color="danger">
                  Не отправлено
                </Typography>
              </Spec>
              <Spec tokens="size: sm · 12px — color: info">
                <Typography as="p" size="sm" color="info">
                  PR #128 ждёт ревью
                </Typography>
              </Spec>
              <Spec tokens="size: xs · 11px — color: fg-muted">
                <Typography as="p" size="xs" color="fg-muted">
                  Подпись: planktonic.app/hq · приглашение действует 7 дней
                </Typography>
              </Spec>
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col">
      {typographySizes.map((size) => (
        <Spec key={size} tokens={`size: ${size} · ${sizePx[size]}`}>
          <Typography {...args} as="p" size={size}>
            Планктон — основа пищевой цепи
          </Typography>
        </Spec>
      ))}
    </div>
  ),
};

export const AllColors: Story = {
  render: (args) => (
    <div className="flex flex-col">
      {typographyColors.map((color) => (
        <Spec key={color} tokens={`color: ${color}`}>
          <Typography {...args} as="p" color={color}>
            Съешь ещё этих мягких французских булок
          </Typography>
        </Spec>
      ))}
    </div>
  ),
};

export const AllWeights: Story = {
  render: (args) => (
    <div className="flex flex-col">
      {typographyWeights.map((weight) => (
        <Spec key={weight} tokens={`weight: ${weight} — size: 4xl · ${sizePx['4xl']}`}>
          <Typography {...args} as="p" weight={weight} size="4xl">
            Планктон — основа пищевой цепи
          </Typography>
        </Spec>
      ))}
    </div>
  ),
};
