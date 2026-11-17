import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { LoadMore, Pagination, paginationVariants, PaginationStatus } from './pagination';

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

function ControlledPagination(props: {
  totalPages: number;
  initial: number;
  variant?: 'numbers' | 'compact';
  'aria-label'?: string;
}) {
  const [page, setPage] = useState(props.initial);
  return (
    <Pagination
      page={page}
      totalPages={props.totalPages}
      onPageChange={(next) => {
        setPage(next);
      }}
      variant={props.variant}
      aria-label={props['aria-label']}
    />
  );
}

function LoadMoreDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <LoadMore
      batchSize={20}
      loading={loading}
      onLoadMore={() => {
        setLoading(true);
        window.setTimeout(() => {
          setLoading(false);
        }, 1500);
      }}
    />
  );
}

/** Landmark labels must be unique across the page; the spec renders in both theme blocks. */
function PaginationSpec({ labelSuffix = '' }: { labelSuffix?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card label="Номера — десктоп · списки">
          <div className="flex flex-col gap-6">
            <ControlledPagination
              totalPages={12}
              initial={1}
              aria-label={`Пагинация — страница 1${labelSuffix}`}
            />
            <ControlledPagination
              totalPages={12}
              initial={5}
              aria-label={`Пагинация — страница 5${labelSuffix}`}
            />
            <ControlledPagination
              totalPages={12}
              initial={12}
              aria-label={`Пагинация — страница 12${labelSuffix}`}
            />
            <p className="text-[11px] text-fg-muted">
              элементы 28×28 · radius 8 · активная — fill brand
            </p>
          </div>
        </Card>
        <Card label="Компакт — мобайл">
          <div className="flex flex-col gap-6">
            <ControlledPagination
              totalPages={12}
              initial={3}
              variant="compact"
              aria-label={`Пагинация — компакт 3${labelSuffix}`}
            />
            <ControlledPagination
              totalPages={1}
              initial={1}
              variant="compact"
              aria-label={`Пагинация — компакт 1${labelSuffix}`}
            />
          </div>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card label="Загрузить ещё — история чата">
          <LoadMoreDemo />
        </Card>
        <Card label="Статус — счётчик выдачи">
          <PaginationStatus shown={20} total={134} />
        </Card>
      </div>
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — пагинация</h3>
        <PaginationSpec labelSuffix={theme === 'dark' ? ' · тёмная тема' : ''} />
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Pagination',
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  // renders the light and dark blocks itself, so the toolbar theme is locked to light
  globals: { theme: 'light' },
  args: { page: 1, totalPages: 12, onPageChange: fn() },
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
    page: 3,
    totalPages: 12,
    onPageChange: fn(),
    variant: 'numbers',
  },
  argTypes: {
    variant: { control: 'select', options: paginationVariants },
    page: { control: 'number' },
    totalPages: { control: 'number' },
    onPageChange: { control: false },
  },
};

export const LoadMoreStory: StoryObj<typeof LoadMore> = {
  name: 'LoadMore',
  args: { onLoadMore: fn(), loading: false, batchSize: 20 },
  argTypes: {
    loading: { control: 'boolean' },
    batchSize: { control: 'number' },
    onLoadMore: { control: false },
  },
};

export const StatusStory: StoryObj<typeof PaginationStatus> = {
  name: 'Status',
  args: { shown: 20, total: 134 },
  argTypes: {
    shown: { control: 'number' },
    total: { control: 'number' },
  },
};
