import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Select, type SelectOption } from './select';

const roleOptions: SelectOption[] = [
  { value: 'all', label: 'Все участники' },
  { value: 'owner', label: 'Владелец и админы' },
  { value: 'only-owner', label: 'Только владельцы' },
];

const channelOptions: SelectOption[] = [
  { value: 'general', label: '# general' },
  { value: 'alerts', label: '# alerts-github' },
  { value: 'design', label: '# дизайн' },
  { value: 'standup', label: '# standup' },
  { value: 'random', label: '# random' },
  { value: 'dev', label: '# разработка' },
  { value: 'product', label: '# продукт' },
  { value: 'qa', label: '# qa' },
  { value: 'hr', label: '# люди' },
  { value: 'marketing', label: '# маркетинг' },
  { value: 'sales', label: '# продажи' },
  { value: 'support', label: '# поддержка' },
  { value: 'legal', label: '# юристы' },
  { value: 'finance', label: '# финансы' },
  { value: 'offtop', label: '# оффтоп' },
  { value: 'events', label: '# события' },
];

const eventOptions: SelectOption[] = [
  { value: 'pr', label: 'PR открыт' },
  { value: 'review', label: 'Запрос ревью' },
  { value: 'ci', label: 'Результат CI' },
  { value: 'merge', label: 'Merge' },
  { value: 'push', label: 'Push в main' },
];

function ControlledSelect(props: {
  options: SelectOption[];
  initial: string[];
  multiple?: boolean;
  chipsWrap?: boolean;
  searchable?: boolean;
  placeholder?: string;
  portalContainer?: HTMLElement | null;
}) {
  const [value, setValue] = useState<string[]>(props.initial);
  return (
    <Select
      options={props.options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
      }}
      multiple={props.multiple}
      chipsWrap={props.chipsWrap}
      searchable={props.searchable}
      placeholder={props.placeholder ?? 'Выберите…'}
      portalContainer={props.portalContainer}
    />
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  // The dropdown portal renders in body — outside the .dark wrapper, so we pass the
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — селекты</h3>
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Одиночный выбор
            </div>
            <div className="grid max-w-2xl grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-fg-muted">Закрытый / default</span>
                <ControlledSelect
                  options={roleOptions}
                  initial={['owner']}
                  placeholder="Владелец и админы"
                  portalContainer={portalContainer}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-fg-muted">Пустой — плейсхолдер</span>
                <ControlledSelect
                  options={roleOptions}
                  initial={[]}
                  placeholder="Выберите канал"
                  portalContainer={portalContainer}
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Длинный список — поиск и скролл
            </div>
            <div className="max-w-sm">
              <ControlledSelect
                options={channelOptions}
                initial={['general']}
                searchable
                placeholder="Выберите канал"
                portalContainer={portalContainer}
              />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Множественный выбор — чипсы, чекбоксы, счётчик
            </div>
            <div className="max-w-sm">
              <ControlledSelect
                options={eventOptions}
                initial={['pr', 'review']}
                multiple
                placeholder="Выберите события"
                portalContainer={portalContainer}
              />
            </div>
            <p className="mt-4 text-[11px] text-fg-muted">
              чипсы снимаются крестиком · дропдаун не закрывается при выборе
            </p>
          </div>
          <div className="rounded-xl border border-line bg-app p-6">
            <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
              Множественный выбор — переполнение чипсов
            </div>
            <div className="grid max-w-3xl gap-6 desktop-s:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-fg-muted">
                  default — одна строка, многоточие при нехватке места
                </span>
                <div className="max-w-[240px]">
                  <ControlledSelect
                    options={eventOptions}
                    initial={['pr', 'review', 'merge']}
                    multiple
                    placeholder="Выберите события"
                    portalContainer={portalContainer}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-fg-muted">
                  chipsWrap — перенос на строки, поле растёт по высоте
                </span>
                <div className="max-w-[240px]">
                  <ControlledSelect
                    options={eventOptions}
                    initial={['pr', 'review', 'merge']}
                    multiple
                    chipsWrap
                    placeholder="Выберите события"
                    portalContainer={portalContainer}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Select',
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { options: roleOptions, value: ['owner'], onValueChange: fn() },
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
    options: roleOptions,
    value: ['owner'],
    onValueChange: fn(),
    multiple: false,
    chipsWrap: false,
    searchable: false,
    disabled: false,
    placeholder: 'Выберите…',
  },
  argTypes: {
    multiple: { control: 'boolean' },
    chipsWrap: { control: 'boolean' },
    searchable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    options: { control: false },
    onValueChange: { control: false },
    value: { control: false },
  },
};
