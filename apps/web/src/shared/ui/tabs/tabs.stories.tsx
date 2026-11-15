import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Hash, AtSign } from 'lucide-react';
import { Tabs, tabVariants, type TabItem } from './tabs';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-6 text-xs font-medium tracking-wider text-fg-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function ControlledTabs(props: {
  tabs: TabItem[];
  initial: string;
  variant?: 'underline' | 'pill';
}) {
  const [value, setValue] = useState(props.initial);
  return (
    <Tabs
      tabs={props.tabs}
      value={value}
      onValueChange={(next) => {
        setValue(next);
      }}
      variant={props.variant}
    />
  );
}

const projectTabs: TabItem[] = [
  { value: 'discussions', label: 'Обсуждения' },
  { value: 'tasks', label: 'Задачи', count: 12 },
  { value: 'board', label: 'Канбан', count: 3 },
  { value: 'decisions', label: 'Решения', count: 1 },
  { value: 'archive', label: 'Архив', disabled: true },
];

function TabsSpec() {
  return (
    <div className="flex flex-col gap-6">
      <Card label="Underline — основной стиль">
        <div className="flex flex-col gap-6">
          <ControlledTabs
            initial="tasks"
            tabs={[
              { value: 'discussions', label: 'Обсуждения' },
              { value: 'tasks', label: 'Задачи' },
              { value: 'board', label: 'Канбан' },
            ]}
          />
          <ControlledTabs initial="tasks" tabs={projectTabs} />
          <p className="text-[11px] text-fg-muted">
            active: bar 2px brand.primary · hover: текст fg-primary
          </p>
        </div>
      </Card>
      <Card label="Pill — сегмент-фильтр">
        <div className="flex flex-col gap-6">
          <ControlledTabs
            variant="pill"
            initial="tasks"
            tabs={[
              { value: 'tasks', label: 'Задачи' },
              { value: 'board', label: 'Канбан' },
            ]}
          />
          <ControlledTabs
            variant="pill"
            initial="all"
            tabs={[
              { value: 'all', label: 'Все' },
              { value: 'mine', label: 'Мои' },
              { value: 'watching', label: 'Смотрю' },
            ]}
          />
          <p className="text-[11px] text-fg-muted">pill: surface на sunken · активный — тень</p>
        </div>
      </Card>
      <Card label="Компакт — мобайл · фильтры">
        <div className="flex flex-col gap-6">
          <ControlledTabs
            variant="pill"
            initial="week"
            tabs={[
              { value: 'week', label: 'Неделя' },
              { value: 'month', label: 'Месяц' },
            ]}
          />
          <ControlledTabs
            initial="channels"
            tabs={[
              { value: 'channels', label: 'каналы', icon: <Hash className="size-3.5" /> },
              { value: 'mentions', label: 'упоминания', icon: <AtSign className="size-3.5" /> },
              { value: 'tasks', label: 'Задачи', count: 4 },
            ]}
          />
        </div>
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
        <h3 className="mb-4 text-xl font-bold text-fg-primary">Атомы — табы</h3>
        <TabsSpec />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { tabs: projectTabs, value: 'tasks', onValueChange: fn() },
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
    tabs: projectTabs,
    value: 'tasks',
    onValueChange: fn(),
    variant: 'underline',
  },
  argTypes: {
    variant: { control: 'select', options: tabVariants },
    onValueChange: { control: false },
    tabs: { control: false },
  },
};
