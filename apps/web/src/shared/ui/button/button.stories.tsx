import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus } from 'lucide-react';
import {
  Button,
  buttonPalettes,
  buttonSizes,
  buttonVariants,
  type ButtonPalette,
  type ButtonVariant,
} from './button';

interface SpecRowConfig {
  name: string;
  label: string;
  palette: ButtonPalette;
  tokenCaption: string;
}

const solidRows: SpecRowConfig[] = [
  {
    name: 'Primary',
    label: 'Сохранить',
    palette: 'primary',
    tokenCaption: 'fill: $light.brand.primary',
  },
  { name: 'Success', label: 'Подтвердить', palette: 'success', tokenCaption: 'fill: $success' },
  { name: 'Warning', label: 'Отложить', palette: 'warning', tokenCaption: 'fill: $warning' },
  { name: 'Danger', label: 'Удалить', palette: 'danger', tokenCaption: 'fill: $danger' },
  { name: 'Info', label: 'Подробнее', palette: 'info', tokenCaption: 'fill: $info' },
];

const secondaryRows: SpecRowConfig[] = [
  {
    name: 'Secondary',
    label: 'Отмена',
    palette: 'primary',
    tokenCaption: 'fill: $light.bg.sunken + border',
  },
];

const subtleRows: SpecRowConfig[] = [
  {
    name: 'Primary',
    label: 'Настроить',
    palette: 'primary',
    tokenCaption: 'fill: $light.brand.subtle',
  },
  {
    name: 'Success',
    label: 'Принять',
    palette: 'success',
    tokenCaption: 'fill: $light.success.subtle',
  },
  {
    name: 'Warning',
    label: 'Напомнить',
    palette: 'warning',
    tokenCaption: 'fill: $light.warning.subtle',
  },
  {
    name: 'Danger',
    label: 'Отклонить',
    palette: 'danger',
    tokenCaption: 'fill: $light.danger.subtle',
  },
  { name: 'Info', label: 'Детали', palette: 'info', tokenCaption: 'fill: $light.info.subtle' },
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

/** One interactive row per palette: hover / active / focus are checked on the live button. */
function VariantTable({ variant, rows }: { variant: ButtonVariant; rows: SpecRowConfig[] }) {
  return (
    <div>
      <div className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] items-end gap-4">
        <div />
        <div className="text-micro font-bold text-fg-primary">Default</div>
        <div className="text-micro font-bold text-fg-primary">Disabled</div>
        <div className="text-micro font-bold text-fg-primary">Loading</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-line py-3.5"
        >
          <div className="min-w-0">
            <div className="text-caption font-bold text-fg-primary">{row.name}</div>
            <div className="truncate text-[11px] text-fg-muted">{row.tokenCaption}</div>
          </div>
          <div>
            <Button variant={variant} palette={row.palette} size="m">
              {row.label}
            </Button>
          </div>
          <div>
            <Button variant={variant} palette={row.palette} size="m" disabled>
              {row.label}
            </Button>
          </div>
          <div>
            <Button variant={variant} palette={row.palette} size="m" loading>
              Загрузка…
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SizeItem({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {children}
      <div className="text-[11px] whitespace-nowrap text-fg-muted">{caption}</div>
    </div>
  );
}

function SizesAndGeometry() {
  return (
    <Card label="Размеры, иконки и геометрия — desktop / mobile">
      <div className="text-micro font-medium tracking-wider text-fg-muted uppercase">
        Desktop — основные размеры, точный курсор
      </div>
      <div className="mt-4 mb-8 flex flex-wrap items-start gap-6">
        <SizeItem caption="S — 36 px · 13/20">
          <Button size="s">Малая</Button>
        </SizeItem>
        <SizeItem caption="M — 40 px · 14/20">
          <Button size="m">Средняя</Button>
        </SizeItem>
        <SizeItem caption="L — 44 px · 14/20">
          <Button size="l">Большая</Button>
        </SizeItem>
        <SizeItem caption="иконка + подпись">
          <Button size="m">
            <Plus />
            Новый проект
          </Button>
        </SizeItem>
        <SizeItem caption="icon-only — 40×40">
          <Button size="icon" aria-label="Добавить">
            <Plus />
          </Button>
        </SizeItem>
      </div>

      <div className="text-micro font-medium tracking-wider text-fg-muted uppercase">
        Mobile — компактнее, чтобы влезть в 390 px, чаще во всю ширину
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-6">
        <SizeItem caption="S — 32 px · 12/20">
          <Button size="s" className="h-8! text-caption! md:h-8! md:text-caption!">
            Малая
          </Button>
        </SizeItem>
        <SizeItem caption="M — 36 px · 14/20">
          <Button size="m" className="h-9! md:h-9!">
            Средняя
          </Button>
        </SizeItem>
        <SizeItem caption="L — 40 px · 14/20">
          <Button size="l" className="h-10! md:h-10!">
            Большая
          </Button>
        </SizeItem>
        <SizeItem caption="icon-only — 36×36">
          <Button size="icon" aria-label="Добавить" className="size-9! md:size-9!">
            <Plus />
          </Button>
        </SizeItem>
        <SizeItem caption="full-width — 40">
          <div className="w-56">
            <Button size="m" fullWidth>
              Основное действие
            </Button>
          </div>
        </SizeItem>
      </div>

      <p className="mt-8 text-[11px] text-fg-muted">
        Радиус 10 — паддинг по бокам 16 — gap иконка/текст 8 — тач-цель на мобильных держим не ниже
        36 px по высоте
      </p>
    </Card>
  );
}

function ButtonSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Solid — основное действие на экране, одна на форму">
        <VariantTable variant="solid" rows={solidRows} />
      </Card>
      <Card label="Secondary — нейтральные действия (отмена, фильтры)">
        <VariantTable variant="secondary" rows={secondaryRows} />
      </Card>
      <Card label="Subtle — тихие действия в карточках и списках">
        <VariantTable variant="subtle" rows={subtleRows} />
      </Card>
      <SizesAndGeometry />
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — кнопки</h3>
        <ButtonSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Button',
  component: Button,
} satisfies Meta<typeof Button>;

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
    children: 'Сохранить',
    variant: 'solid',
    palette: 'primary',
    size: 'm',
    loading: false,
    disabled: false,
    fullWidth: false,
  },
  argTypes: {
    variant: { control: 'select', options: buttonVariants },
    palette: { control: 'select', options: buttonPalettes },
    size: { control: 'select', options: buttonSizes },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};
