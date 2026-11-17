import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PRODUCT_SLUG } from '@app/config/product';
import { Link, linkVariants, type LinkVariant } from './link';

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

function Column({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="text-micro font-bold text-fg-primary">{label}</div>
      {caption ? <div className="-mt-2 text-[11px] text-fg-muted">{caption}</div> : null}
      {children}
    </div>
  );
}

const navItems: { name: string; variant?: LinkVariant; active?: boolean; disabled?: boolean }[] = [
  { name: '# общий' },
  { name: '# дизайн' },
  { name: `# ${PRODUCT_SLUG}`, active: true },
  { name: '# рандом' },
  { name: 'архив', disabled: true },
];

function LinkSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Состояния — hover / active смотрим интерактивно">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Column label="Inline" caption="в тексте сообщения">
            <Link href="#">Регламент в гайде</Link>
            <Link disabled href="#">
              Регламент в гайде
            </Link>
          </Column>
          <Column label="External" caption="↗ открывается в новой вкладке">
            <Link variant="external" href="#">
              {`github.com/${PRODUCT_SLUG}`}
            </Link>
            <Link variant="external" href="#">
              PR #128
            </Link>
            <Link variant="external" disabled href="#">
              документация
            </Link>
          </Column>
        </div>
      </Card>
      <Card label="Навигационная — свободно, active — brand.subtle">
        <div className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              variant="nav"
              active={item.active}
              disabled={item.disabled}
              href="#"
              aria-current={item.active ? 'page' : undefined}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </Card>
      <p className="text-[11px] text-fg-muted">
        default — brand.primary · hover — underline · active — brand.active · disabled — muted
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — ссылки</h3>
        <LinkSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Link',
  component: Link,
} satisfies Meta<typeof Link>;

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
    children: 'Регламент в гайде',
    variant: 'inline',
    active: false,
    disabled: false,
    href: '#',
  },
  argTypes: {
    variant: { control: 'select', options: linkVariants },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
