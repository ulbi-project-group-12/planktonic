import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CornerUpLeft, Plus, Star, AtSign, Link2, Copy, Trash2, Pencil, Pin } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
} from './dropdown';

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-auto rounded border border-line bg-sunken px-1 py-px font-mono text-[10px] text-fg-secondary">
      {children}
    </kbd>
  );
}

function Card({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-app p-6">
      <div className="mb-2 text-micro font-medium tracking-wider text-fg-muted uppercase">
        {label}
      </div>
      <div className="mb-6 text-[11px] text-fg-muted">{caption}</div>
      {children}
    </div>
  );
}

function MenuDemo({
  children,
  label = 'Меню',
  portalContainer,
}: {
  children: ReactNode;
  label?: string;
  portalContainer?: HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger>
        <Button size="s" variant="secondary">
          {label}
        </Button>
      </DropdownTrigger>
      <DropdownContent portalContainer={portalContainer}>{children}</DropdownContent>
    </Dropdown>
  );
}

function SortDemo({ portalContainer }: { portalContainer?: HTMLElement | null }) {
  const [order, setOrder] = useState<'new' | 'old'>('new');
  return (
    <MenuDemo label="Сортировка" portalContainer={portalContainer}>
      <DropdownLabel>Сортировка</DropdownLabel>
      <DropdownCheckboxItem
        checked={order === 'new'}
        onSelect={() => {
          setOrder('new');
        }}
      >
        Сначала новые
      </DropdownCheckboxItem>
      <DropdownCheckboxItem
        checked={order === 'old'}
        onSelect={() => {
          setOrder('old');
        }}
      >
        Сначала старые
      </DropdownCheckboxItem>
    </MenuDemo>
  );
}

function SubmenuDemo({ portalContainer }: { portalContainer?: HTMLElement | null }) {
  return (
    <MenuDemo label="Действия" portalContainer={portalContainer}>
      <DropdownItem>
        <Pencil className="size-3.5 text-fg-muted" />
        Редактировать
      </DropdownItem>
      <DropdownSub>
        <DropdownSubTrigger>Перенести</DropdownSubTrigger>
        <DropdownSubContent portalContainer={portalContainer}>
          <DropdownLabel>Перенести в</DropdownLabel>
          <DropdownItem onSelect={fn()}>Задачи</DropdownItem>
          <DropdownItem onSelect={fn()}>Канбан</DropdownItem>
          <DropdownItem onSelect={fn()}>Решения</DropdownItem>
        </DropdownSubContent>
      </DropdownSub>
      <DropdownSeparator />
      <DropdownItem danger>
        <Trash2 className="size-3.5" />
        Удалить
      </DropdownItem>
    </MenuDemo>
  );
}

function DropdownSpec({ portalContainer }: { portalContainer?: HTMLElement | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card label="Базовое" caption="меню сообщения · radius 10 · item 28">
          <MenuDemo portalContainer={portalContainer}>
            <DropdownItem>Ответить в ветке</DropdownItem>
            <DropdownItem>Создать задачу</DropdownItem>
            <DropdownItem>Закрепить</DropdownItem>
            <DropdownItem>Копировать ссылку</DropdownItem>
          </MenuDemo>
        </Card>
        <Card label="С иконками" caption="гнёзд 11px">
          <MenuDemo portalContainer={portalContainer}>
            <DropdownItem>
              <CornerUpLeft className="size-3.5 text-fg-muted" />
              Ответить
            </DropdownItem>
            <DropdownItem>
              <Plus className="size-3.5 text-fg-muted" />
              Создать задачу
            </DropdownItem>
            <DropdownItem>
              <Star className="size-3.5 text-fg-muted" />В избранное
            </DropdownItem>
            <DropdownItem>
              <AtSign className="size-3.5 text-fg-muted" />
              Упомянуть
            </DropdownItem>
          </MenuDemo>
        </Card>
        <Card label="С хоткеями" caption="kbd справа">
          <MenuDemo portalContainer={portalContainer}>
            <DropdownItem>
              Редактировать
              <Kbd>E</Kbd>
            </DropdownItem>
            <DropdownItem>
              Ответить
              <Kbd>R</Kbd>
            </DropdownItem>
            <DropdownItem>
              Закрепить
              <Kbd>P</Kbd>
            </DropdownItem>
          </MenuDemo>
        </Card>
        <Card label="Danger" caption="удаление внизу">
          <MenuDemo portalContainer={portalContainer}>
            <DropdownItem>
              <Copy className="size-3.5 text-fg-muted" />
              Копировать текст
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger>
              <Trash2 className="size-3.5" />
              Удалить сообщение
            </DropdownItem>
          </MenuDemo>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card label="Состояния — выбор" caption="выбран · off · подпись">
          <SortDemo portalContainer={portalContainer} />
        </Card>
        <Card label="Состояния — подменю и disabled" caption="сабменю открывается справа">
          <SubmenuDemo portalContainer={portalContainer} />
        </Card>
      </div>
      <p className="text-[11px] text-fg-muted">
        radius 10 · item 28 · hover bg.sunken · shadow-sm (токен теней) · z/menu 50
      </p>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  // The menu portal renders in body — outside the .dark wrapper, so we pass the
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — дропдаун</h3>
        <DropdownSpec portalContainer={portalContainer} />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Dropdown',
  component: Dropdown,
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { children: null },
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
    open: false,
    onOpenChange: fn(),
    children: null,
  },
  argTypes: {
    open: { control: 'boolean' },
    onOpenChange: { control: false },
    children: { control: false },
  },
  render: (args) => (
    <div className="p-20">
      <Dropdown {...args}>
        <DropdownTrigger>
          <Button size="s" variant="secondary">
            Меню
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem>
            <Pin className="size-3.5 text-fg-muted" />
            Закрепить
          </DropdownItem>
          <DropdownItem>
            <Link2 className="size-3.5 text-fg-muted" />
            Копировать ссылку
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger>
            <Trash2 className="size-3.5" />
            Удалить сообщение
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  ),
};
