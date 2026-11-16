import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from './skeleton';

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

function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-1 flex-col gap-2 pt-0.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function AiSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Avatar name="Plankton AI" size="sm" />
        <span className="text-caption font-bold text-fg-primary">Plankton AI</span>
        <Badge dot variant="brand" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <span className="text-micro text-fg-muted">streaming…</span>
    </div>
  );
}

function SkeletonSpec() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card label="Сообщения">
        <div className="flex flex-col gap-6">
          <MessageSkeleton />
          <MessageSkeleton />
        </div>
      </Card>
      <Card label="Карточка — задача · канбан">
        <TaskCardSkeleton />
      </Card>
      <Card label="ИИ-генерация">
        <AiSkeleton />
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — скелетон</h3>
        <SkeletonSpec />
        <p className="mt-6 text-[11px] text-fg-muted">bg.sunken · radius 4 · импульс 1.2 s</p>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
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
  args: { className: 'h-4 w-48' },
  argTypes: {
    className: { control: 'text' },
  },
};
