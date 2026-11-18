import { useCallback, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Settings2 } from 'lucide-react';
import {
  Button,
  Checkbox,
  Chip,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownTrigger,
  Pagination,
  Select,
  Switch,
  Table,
} from '@/shared/ui';
import type { TableSort } from '@/shared/ui';
import { TableRow } from './table';
import { TASKS, buildColumns, rowActions } from './table.demo';
import type { Task, TaskStatus } from './table.demo';

const allColumns: { id: string; label: string }[] = [
  { id: 'id', label: 'ID' },
  { id: 'title', label: 'Задача' },
  { id: 'status', label: 'Статус' },
  { id: 'priority', label: 'Приоритет' },
  { id: 'assignee', label: 'Исполнитель' },
  { id: 'due', label: 'Срок' },
  { id: 'updated', label: 'Обновлено' },
];

interface FilterChip {
  id: number;
  field: 'status' | 'assignee';
  value: string;
}

const filterFieldOptions = [
  { value: 'status', label: 'Статус' },
  { value: 'assignee', label: 'Исполнитель' },
];

const filterConditionOptions = [{ value: 'is', label: 'равно' }];

const statusValues: TaskStatus[] = ['Нужно сделать', 'В работе', 'На проверке', 'Готово'];

/** Filter builder — demo-only: filtering logic lives outside the Table atom. */
function FilterBuilder({
  portalContainer,
  onApply,
}: {
  portalContainer: HTMLElement | null;
  onApply: (filter: Omit<FilterChip, 'id'>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<'status' | 'assignee'>('status');
  const [values, setValues] = useState<string[]>([]);

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger>
        <Button variant="subtle" size="s">
          + Фильтр
        </Button>
      </DropdownTrigger>
      <DropdownContent portalContainer={portalContainer} align="start" className="w-72 p-3">
        <div className="mb-3 text-body-s font-bold text-fg-primary">Новый фильтр</div>
        <div className="flex flex-col gap-2">
          <Select
            options={filterFieldOptions}
            value={[field]}
            onValueChange={(value) => {
              setField(value[0] as 'status' | 'assignee');
              setValues([]);
            }}
            portalContainer={portalContainer}
          />
          <Select
            options={filterConditionOptions}
            value={['is']}
            onValueChange={() => undefined}
            portalContainer={portalContainer}
          />
          {field === 'status' ? (
            <div className="flex flex-col gap-2.5 py-1">
              {statusValues.map((status) => (
                <Checkbox
                  key={status}
                  label={status}
                  checked={values.includes(status)}
                  onCheckedChange={(checked) => {
                    setValues(
                      checked ? [...values, status] : values.filter((item) => item !== status),
                    );
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 py-1">
              {[...new Set(TASKS.map((task) => task.assignee))].map((assignee) => (
                <Checkbox
                  key={assignee}
                  label={assignee}
                  checked={values.includes(assignee)}
                  onCheckedChange={(checked) => {
                    setValues(
                      checked ? [...values, assignee] : values.filter((item) => item !== assignee),
                    );
                  }}
                />
              ))}
            </div>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="s"
              onClick={() => {
                setOpen(false);
              }}
            >
              Отмена
            </Button>
            <Button
              size="s"
              onClick={() => {
                values.forEach((value) => {
                  onApply({ field, value });
                });
                setValues([]);
                setOpen(false);
              }}
            >
              Применить
            </Button>
          </div>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}

/** Column visibility — demo-only: visibility state lives outside the Table atom. */
function ColumnsSettings({
  portalContainer,
  hidden,
  onToggle,
  onReset,
}: {
  portalContainer: HTMLElement | null;
  hidden: Set<string>;
  onToggle: (columnId: string, visible: boolean) => void;
  onReset: () => void;
}) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          type="button"
          aria-label="Настроить колонки"
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
        >
          <Settings2 className="size-4" />
        </button>
      </DropdownTrigger>
      <DropdownContent portalContainer={portalContainer} align="end" className="w-60">
        <DropdownLabel>Колонки</DropdownLabel>
        {allColumns.map((column) => (
          <div
            key={column.id}
            className="flex h-7 items-center gap-2 rounded-md px-2 text-caption text-fg-primary"
          >
            <span aria-hidden className="text-fg-muted">
              ⠿
            </span>
            <Switch
              label={column.label}
              checked={!hidden.has(column.id)}
              onCheckedChange={(checked) => {
                onToggle(column.id, checked);
              }}
              className="flex-1 justify-between"
            />
          </div>
        ))}
        <DropdownItem
          className="mt-1"
          onSelect={() => {
            onReset();
          }}
        >
          Сбросить по умолчанию
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12">
      <div className="flex size-10 items-center justify-center rounded-xl bg-sunken text-fg-muted">
        <SearchIcon />
      </div>
      <div className="text-body-s font-bold text-fg-primary">Ничего не найдено</div>
      <div className="text-caption text-fg-muted">
        Попробуйте изменить фильтры или сбросить поиск
      </div>
      {onReset ? (
        <Button variant="subtle" size="s" className="mt-1" onClick={onReset}>
          Сбросить фильтры
        </Button>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/** The mockup's task table: selection, sorting, filters and column settings composed on top of the atom. */
function TaskTableDemo({
  portalContainer,
  instance,
}: {
  portalContainer: HTMLElement | null;
  /** Unique suffix for landmark labels when two themed copies render side by side. */
  instance: string;
}) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: 'updated', direction: 'desc' });
  const [filters, setFilters] = useState<FilterChip[]>([
    { id: 1, field: 'status', value: 'В работе' },
    { id: 2, field: 'assignee', value: 'Мария С.' },
  ]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(['updated']));
  const [page, setPage] = useState(1);
  const filterIdRef = useRef(3);

  const columns = useMemo(
    () => buildColumns().filter((column) => !hidden.has(column.id)),
    [hidden],
  );

  const filtered = useMemo(() => {
    if (filters.length === 0) return TASKS;

    const valuesByField = new Map<FilterChip['field'], Set<string>>();
    for (const filter of filters) {
      const set = valuesByField.get(filter.field) ?? new Set<string>();
      set.add(filter.value);
      valuesByField.set(filter.field, set);
    }

    return TASKS.filter((task) =>
      [...valuesByField.entries()].every(([field, values]) =>
        field === 'status' ? values.has(task.status) : values.has(task.assignee),
      ),
    );
  }, [filters]);

  const removeFilter = (id: number) => {
    setFilters(filters.filter((filter) => filter.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Chip
            key={filter.id}
            fill="subtle"
            palette="brand"
            onRemove={() => {
              removeFilter(filter.id);
            }}
          >
            {filter.field === 'status' ? 'Статус' : 'Исполнитель'}: {filter.value}
          </Chip>
        ))}
        <FilterBuilder
          portalContainer={portalContainer}
          onApply={(filter) => {
            setFilters((prev) => [...prev, { ...filter, id: filterIdRef.current++ }]);
          }}
        />
      </div>

      <Table<Task>
        data={filtered}
        columns={columns}
        rowKey={(task) => task.id}
        caption="Задачи проекта"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        sort={sort}
        onSortChange={setSort}
        actions={rowActions}
        headerActions={
          <ColumnsSettings
            portalContainer={portalContainer}
            hidden={hidden}
            onToggle={(columnId, visible) => {
              const next = new Set(hidden);
              if (visible) next.delete(columnId);
              else next.add(columnId);
              setHidden(next);
            }}
            onReset={() => {
              setHidden(new Set());
            }}
          />
        }
        empty={
          <EmptyState
            onReset={() => {
              setFilters([]);
            }}
          />
        }
        portalContainer={portalContainer}
      />

      <div className="flex items-center justify-between text-caption text-fg-muted">
        <span>
          {selectedIds.length > 0
            ? `Выбрано: ${String(selectedIds.length)} из ${String(TASKS.length)}`
            : filters.length > 0
              ? `Найдено: ${String(filtered.length)} из ${String(TASKS.length)}`
              : `${String(TASKS.length)} задач`}
        </span>
        <span className="flex items-center gap-3">
          Строк на странице: 20
          <Pagination
            page={page}
            totalPages={4}
            onPageChange={setPage}
            aria-label={`Страницы задач, ${instance}`}
          />
        </span>
      </div>
    </div>
  );
}

function TableSpec({
  portalContainer,
  instance,
}: {
  portalContainer: HTMLElement | null;
  instance: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">
          Table · id, чекбоксы, сортировка, действия (фильтры и колонки — снаружи)
        </h4>
        <TaskTableDemo portalContainer={portalContainer} instance={instance} />
      </div>
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">
          Table · с id, без чекбоксов и без действий
        </h4>
        <Table<Task>
          data={TASKS}
          columns={buildColumns()}
          rowKey={(task) => task.id}
          caption="Задачи без выбора и действий"
        />
      </div>
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">
          Table · без id, только информация
        </h4>
        <Table<Task>
          data={TASKS}
          columns={buildColumns().filter((column) =>
            ['title', 'status', 'assignee', 'updated'].includes(column.id),
          )}
          rowKey={(task) => task.id}
          caption="Информационная таблица"
        />
      </div>
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">Table · пустое состояние</h4>
        <Table<Task>
          data={[]}
          columns={buildColumns()}
          rowKey={(task) => task.id}
          caption="Пустая таблица"
          empty={<EmptyState />}
        />
      </div>
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">Table · загрузка</h4>
        <Table<Task>
          data={TASKS}
          columns={buildColumns()}
          rowKey={(task) => task.id}
          caption="Загрузка таблицы"
          selectable
          loading
        />
        <p className="mt-2 text-caption text-fg-muted">Загрузка…</p>
      </div>
      <div>
        <h4 className="mb-3 text-body-s font-bold text-fg-primary">TableRow · вне таблицы</h4>
        <p className="mb-2 text-caption text-fg-muted">
          Строка на общей сетке: та же разметка в карточке, без атома Table
        </p>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <TableRow
            presentation
            gridTemplateColumns="90px minmax(160px, 1fr) 140px"
            className="h-11"
          >
            <div className="flex items-center px-3 text-body-s font-bold text-fg-primary">
              PL-42
            </div>
            <div className="flex min-w-0 items-center px-3 text-body-s text-fg-primary">
              <span className="truncate">Двойной вызов useEffect в канбане</span>
            </div>
            <div className="flex items-center px-3">
              <Chip palette="info" fill="subtle">
                В работе
              </Chip>
            </div>
          </TableRow>
        </div>
      </div>
    </div>
  );
}

function ThemeBlock({ theme }: { theme: 'light' | 'dark' }) {
  // Menus and the select portal render in body — outside the .dark wrapper, so we pass the
  // themed container explicitly so the popups inherit the block theme tokens.
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
        <h3 className="mb-4 text-body-l font-bold text-fg-primary">Атомы — таблица</h3>
        <TableSpec
          portalContainer={portalContainer}
          instance={theme === 'light' ? 'светлая тема' : 'тёмная тема'}
        />
        <p className="mt-6 text-[11px] text-fg-muted">
          Сортировка string/number/date · выбор строк · меню действий · ресайз колонок · скролл по
          ширине
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'shared/Atoms/Table',
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;

export const States: StoryObj = {
  name: 'States',
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

export const Playground: StoryObj = {
  name: 'Playground',
  argTypes: {
    selectable: { control: 'boolean' },
    loading: { control: 'boolean' },
    withActions: { control: 'boolean' },
    sorted: { control: 'boolean' },
  },
  args: { selectable: true, loading: false, withActions: true, sorted: true },
  render: (args) => {
    const { selectable, loading, withActions, sorted } = args as {
      selectable: boolean;
      loading: boolean;
      withActions: boolean;
      sorted: boolean;
    };
    return (
      <div className="p-8">
        <Table<Task>
          data={TASKS}
          columns={buildColumns().map((column) =>
            column.id === 'title' || column.id === 'id' || column.id === 'due'
              ? { ...column, sortable: sorted }
              : column,
          )}
          rowKey={(task) => task.id}
          caption="Задачи проекта"
          selectable={selectable}
          loading={loading}
          actions={withActions ? rowActions : undefined}
        />
      </div>
    );
  },
};
