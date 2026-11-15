import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Search } from 'lucide-react';
import { PRODUCT_SLUG } from '@app/config/product';
import { Input, inputStatuses } from './input';

interface SpecRowConfig {
  name: string;
  spec: string;
  cells: {
    default: ReactNode;
    error?: ReactNode;
    success?: ReactNode;
    disabled: ReactNode;
  };
}

const stringRows: SpecRowConfig[] = [
  {
    name: 'Базовое поле',
    spec: 'h 40 · radius 10 · 14/400',
    cells: {
      default: <Input defaultValue={`${PRODUCT_SLUG} HQ`} aria-label="Базовое поле" />,
      error: (
        <Input
          defaultValue={`${PRODUCT_SLUG} HQ!!`}
          status="error"
          message="Недопустимые символы"
          aria-label="Базовое поле с ошибкой"
        />
      ),
      success: (
        <Input
          defaultValue={`${PRODUCT_SLUG} HQ`}
          status="success"
          message="Название доступно"
          aria-label="Базовое поле, успех"
        />
      ),
      disabled: (
        <Input defaultValue={`${PRODUCT_SLUG} HQ`} disabled aria-label="Базовое поле отключено" />
      ),
    },
  },
  {
    name: 'Плейсхолдер',
    spec: 'muted 14/400',
    cells: {
      default: <Input placeholder="Введите название" aria-label="Плейсхолдер" />,
      error: (
        <Input
          placeholder="Введите название"
          status="error"
          message="Поле обязательное"
          aria-label="Плейсхолдер с ошибкой"
        />
      ),
      success: (
        <Input
          defaultValue={`${PRODUCT_SLUG} HQ`}
          status="success"
          message="Название доступно"
          aria-label="Плейсхолдер, успех"
        />
      ),
      disabled: <Input placeholder="Введите название" disabled aria-label="Плейсхолдер отключен" />,
    },
  },
  {
    name: 'С label и хинтом',
    spec: 'label 13/700 · hint 12',
    cells: {
      default: (
        <Input
          label="Название пространства"
          hint="От 3 до 50 символов"
          defaultValue={`${PRODUCT_SLUG} HQ`}
        />
      ),
      error: <Input label="Slug" status="error" message="Slug уже занят" defaultValue="hq" />,
      success: (
        <Input label="Slug" status="success" message="Адрес свободен" defaultValue="hq-team" />
      ),
      disabled: (
        <Input
          label="Название пространства"
          hint="Менять может владелец"
          defaultValue={`${PRODUCT_SLUG} HQ`}
          disabled
        />
      ),
    },
  },
  {
    name: 'С иконкой слева',
    spec: 'поиск · 13 px icon',
    cells: {
      default: <Input icon={<Search />} defaultValue="alerts" aria-label="Поиск" />,
      error: (
        <Input
          icon={<Search />}
          defaultValue="!!!"
          status="error"
          message="Символы недопустимы"
          aria-label="Поиск с ошибкой"
        />
      ),
      success: (
        <Input icon={<Search />} defaultValue="alerts" status="success" aria-label="Поиск, успех" />
      ),
      disabled: (
        <Input icon={<Search />} defaultValue="alerts" disabled aria-label="Поиск отключен" />
      ),
    },
  },
];

const numberRows: SpecRowConfig[] = [
  {
    name: 'Степпер',
    spec: 'mono 14 · шаг 1',
    cells: {
      default: <Input type="number" defaultValue={42} aria-label="Степпер" />,
      error: (
        <Input
          type="number"
          defaultValue={999}
          status="error"
          message="Максимум 100"
          aria-label="Степпер с ошибкой"
        />
      ),
      success: (
        <Input type="number" defaultValue={42} status="success" aria-label="Степпер, успех" />
      ),
      disabled: <Input type="number" defaultValue={42} disabled aria-label="Степпер отключен" />,
    },
  },
  {
    name: 'С суффиксом',
    spec: 'единицы справа',
    cells: {
      default: <Input type="number" defaultValue={10} suffix="дн." aria-label="Срок" />,
      error: (
        <Input
          type="number"
          defaultValue={0}
          suffix="дн."
          status="error"
          message="Минимум 1 день"
          aria-label="Срок с ошибкой"
        />
      ),
      success: (
        <Input
          type="number"
          defaultValue={10}
          suffix="дн."
          status="success"
          aria-label="Срок, успех"
        />
      ),
      disabled: (
        <Input type="number" defaultValue={10} suffix="дн." disabled aria-label="Срок отключен" />
      ),
    },
  },
];

const columns: { key: keyof SpecRowConfig['cells']; title: string; caption: string }[] = [
  { key: 'default', title: 'Default', caption: 'белый фон + border.default' },
  { key: 'error', title: 'Error', caption: 'border $danger + сообщение' },
  { key: 'success', title: 'Success', caption: 'border $success + иконка' },
  { key: 'disabled', title: 'Disabled', caption: 'фон sunken + текст muted' },
];

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function SpecTable({ rows }: { rows: SpecRowConfig[] }) {
  return (
    <div>
      <div className="grid grid-cols-[180px_repeat(4,minmax(0,1fr))] items-end gap-x-4 gap-y-2">
        <div />
        {columns.map((column) => (
          <div key={column.key} className="min-w-0">
            <div className="text-xs font-bold text-fg-primary">{column.title}</div>
            <div className="truncate text-[11px] text-fg-muted">{column.caption}</div>
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[180px_repeat(4,minmax(0,1fr))] items-start gap-x-4 gap-y-2 border-t border-line py-4"
        >
          <div className="min-w-0 pt-2">
            <div className="text-sm font-bold text-fg-primary">{row.name}</div>
            <div className="truncate text-[11px] text-fg-muted">{row.spec}</div>
          </div>
          {columns.map((column) => (
            <div key={column.key} className="min-w-0">
              {row.cells[column.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function InputSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Строковый инпут">
        <SpecTable rows={stringRows} />
      </Card>
      <Card label="Числовой инпут">
        <SpecTable rows={numberRows} />
        <p className="mt-6 text-[11px] text-fg-muted">
          На мобильных степпер скрываем — клавиатура inputmode: numeric, валидация на blur.
          Focus-visible: белый фон, border brand и кольцо 3 + 6 px — фон не затемняем, чтобы не
          путать с disabled
        </p>
      </Card>
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
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — инпуты</h3>
        <InputSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Input',
  component: Input,
} satisfies Meta<typeof Input>;

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
    label: 'Название пространства',
    hint: 'От 3 до 50 символов',
    placeholder: 'Введите название',
    status: 'default',
    message: '',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    placeholder: { control: 'text' },
    status: { control: 'select', options: inputStatuses },
    message: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} defaultValue={`${PRODUCT_SLUG} HQ`} />
    </div>
  ),
};
