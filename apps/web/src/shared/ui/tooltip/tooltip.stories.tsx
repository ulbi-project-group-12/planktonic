import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useCallback, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Tooltip, tooltipSides, TooltipProvider, type TooltipSide } from './tooltip';

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-1 rounded border border-line bg-sunken px-1 py-px font-mono text-[10px]">
      {children}
    </kbd>
  );
}

function Section({
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
      <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
        {label}
      </div>
      <div className="grid grid-cols-[140px_1fr] items-center gap-4">
        <div className="min-w-0">
          <div className="text-caption font-bold text-fg-primary">{label}</div>
          <div className="text-[11px] text-fg-muted">{caption}</div>
        </div>
        <div className="flex flex-wrap items-center gap-10 py-6">{children}</div>
      </div>
    </div>
  );
}

function SideDemo({
  side,
  label,
  portalContainer,
}: {
  side: TooltipSide;
  label: string;
  portalContainer?: HTMLElement | null;
}) {
  return (
    <Tooltip content={label} side={side} portalContainer={portalContainer}>
      <Button variant="subtle" size="s">
        Наведи
      </Button>
    </Tooltip>
  );
}

function TooltipSpec({ portalContainer }: { portalContainer?: HTMLElement | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-app p-6">
        <div className="mb-6 text-micro font-medium tracking-wider text-fg-muted uppercase">
          Позиции — стрелка указывает на триггер
        </div>
        <div className="flex flex-wrap items-center gap-10 py-6">
          <SideDemo side="top" label="Создать задачу" portalContainer={portalContainer} />
          <SideDemo side="right" label="Наверх" portalContainer={portalContainer} />
          <SideDemo side="bottom" label="Реакции" portalContainer={portalContainer} />
          <SideDemo side="left" label="Закрепить" portalContainer={portalContainer} />
        </div>
      </div>
      <Section label="Варианты" caption="delay · title · kbd · описание">
        <Tooltip
          content="Создать задачу из сообщения"
          side="bottom"
          portalContainer={portalContainer}
        >
          <Button variant="subtle" size="s">
            Из сообщения
          </Button>
        </Tooltip>
        <Tooltip
          side="bottom"
          portalContainer={portalContainer}
          content={
            <span>
              Сохранить в избранное
              <span className="mt-0.5 block text-fg-secondary">
                Сообщение попадёт в личный список
              </span>
            </span>
          }
        >
          <Button variant="subtle" size="s">
            С описанием
          </Button>
        </Tooltip>
        <Tooltip
          side="bottom"
          portalContainer={portalContainer}
          content={<span>Поиск{<Kbd>Ctrl K</Kbd>}</span>}
        >
          <Button variant="subtle" size="s">
            С kbd
          </Button>
        </Tooltip>
        <Tooltip
          side="bottom"
          portalContainer={portalContainer}
          content="Участники закрытого канала видны только его членам — длинный текст переносится по ширине"
        >
          <Button variant="subtle" size="s">
            max-width 280 · wrap
          </Button>
        </Tooltip>
      </Section>
      <p className="text-[11px] text-fg-muted">
        появление мгновенно · radius 8 · pad 8/12 · подложка surface
      </p>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  // Портал подсказки рендерится в body — вне .dark-обёртки, поэтому темизируемый
  // контейнер передаём явно, чтобы облако наследовало токены темы блока.
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — тултипы</h3>
        <TooltipSpec portalContainer={portalContainer} />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Tooltip',
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { content: 'Создать задачу', children: <button type="button">Наведи</button> },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <TooltipProvider>
      <div className="flex flex-col gap-10 bg-app p-8 font-sans">
        <ThemeBlock theme="light" />
        <ThemeBlock theme="dark" />
      </div>
    </TooltipProvider>
  ),
};

export const Playground: Story = {
  args: {
    content: 'Создать задачу',
    side: 'top',
    delayDuration: 300,
    maxWidth: 280,
    children: <button type="button">Наведи</button>,
  },
  argTypes: {
    content: { control: 'text' },
    side: { control: 'select', options: tooltipSides },
    delayDuration: { control: 'number' },
    maxWidth: { control: 'number' },
    open: { control: false },
    onOpenChange: { control: false },
    children: { control: false },
  },
  decorators: [
    (StoryComponent) => (
      <TooltipProvider>
        <div className="p-20">
          <StoryComponent />
        </div>
      </TooltipProvider>
    ),
  ],
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="subtle" size="s">
        Наведи
      </Button>
    </Tooltip>
  ),
};
