'use client';

import { useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, PointerEvent, ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GripVertical,
  MoreHorizontal,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/shared/ui/dropdown';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';

const tableSortTypes = ['string', 'number', 'date', 'boolean'] as const;
type TableSortType = (typeof tableSortTypes)[number];

type TableSortDirection = 'asc' | 'desc';

interface TableSort {
  columnId: string;
  direction: TableSortDirection;
}

interface TableColumn<T> {
  id: string;
  /** Column title: text, icon or any markup. */
  header: ReactNode;
  /** Cell content; by default — accessor() as text. */
  cell?: (row: T, rowIndex: number) => ReactNode;
  /** Raw value: the default cell text and the default sort value. */
  accessor?: (row: T) => unknown;
  /** Clicking the header sorts by this column. */
  sortable?: boolean;
  /** How sort values compare: 'string' (alphabetical, ru) by default. */
  sortType?: TableSortType;
  /** Custom comparison (receives whole rows); overrides sortType. Null/empty handling is the comparator's job. */
  sortCompare?: (a: T, b: T) => number;
  /** Initial width: px number or any grid track ('200px', 'minmax(0,2fr)'). Resizable on the fly. */
  width?: number | string;
  align?: 'left' | 'right' | 'center';
}

interface TableAction<T> {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  onSelect: (row: T) => void;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  /** Unique row id — used for selection. */
  rowKey: (row: T) => string | number;
  /** Checkbox column with select-all. */
  selectable?: boolean;
  /** Selected row ids (controlled). */
  selectedIds?: (string | number)[];
  /** Selected row ids on first render (uncontrolled). */
  defaultSelectedIds?: (string | number)[];
  onSelectedIdsChange?: (ids: (string | number)[]) => void;
  /** Active sort (controlled); pass null to clear. */
  sort?: TableSort | null;
  /** Active sort on first render (uncontrolled). */
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** Trailing actions column: a menu per row ('···'). Static list or per row. */
  actions?: TableAction<T>[] | ((row: T) => TableAction<T>[]);
  /** Content of the actions column header (e.g. a settings gear). */
  headerActions?: ReactNode;
  /** Accessible name of the row menu trigger. */
  actionLabel?: string;
  /** Skeleton rows instead of data. */
  loading?: boolean;
  /** Content of the empty state row. */
  empty?: ReactNode;
  /** Accessible name of the table. */
  caption?: string;
  onRowClick?: (row: T) => void;
  /** Portal container for row menus (a themed story block); defaults to body. */
  portalContainer?: HTMLElement | null;
  className?: string;
  /** Show the built-in column settings dropdown: visibility toggles and drag-to-reorder. */
  showColumnSettings?: boolean;
  /** Accessible name of the column settings trigger. */
  columnSettingsLabel?: string;
  /** Hidden column ids (controlled). */
  hiddenColumnIds?: string[];
  /** Hidden column ids on first render (uncontrolled). */
  defaultHiddenColumnIds?: string[];
  onHiddenColumnIdsChange?: (ids: string[]) => void;
  /** Column order (controlled). */
  columnOrder?: string[];
  /** Column order on first render (uncontrolled). */
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (ids: string[]) => void;
}

const MIN_COLUMN_WIDTH = 64;

/** Comparison by the column sort type; strings — alphabetical with ru locale. */
function compareValues(a: unknown, b: unknown, type: TableSortType): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  switch (type) {
    case 'number': {
      return Number(a) - Number(b);
    }
    case 'date': {
      const time = (value: unknown) =>
        value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
      return time(a) - time(b);
    }
    case 'boolean': {
      return Number(Boolean(a)) - Number(Boolean(b));
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- unknown sort values are intentionally stringified
      return String(a).localeCompare(
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- unknown sort values are intentionally stringified
        String(b),
        'ru',
      );
    }
  }
}

interface TableRowProps extends ComponentPropsWithoutRef<'div'> {
  /** Standalone use: grid-template-columns of the row (inside Table it is inherited). */
  gridTemplateColumns?: string;
  selected?: boolean;
  /** Row hover background; off for skeleton and empty states. */
  hoverable?: boolean;
  /**
   * Bare rows carry no background or border of their own — cells do. Used inside Table,
   * where a row-level background would only cover the scrollport width (not the overflow)
   * and double-paint over cell backgrounds; standalone rows keep theirs.
   */
  bare?: boolean;
  /** Standalone layout reuse outside a Table: renders without row semantics (a div grid is not a table row). */
  presentation?: boolean;
}

/** A table row on the shared grid — renders with the same layout inside and outside Table. */
function TableRow({
  gridTemplateColumns,
  selected = false,
  hoverable = true,
  bare = false,
  presentation = false,
  className,
  style,
  ...props
}: TableRowProps) {
  return (
    <div
      role={presentation ? undefined : 'row'}
      aria-selected={presentation ? undefined : selected || undefined}
      data-slot="table-row"
      className={cn(
        // No items-center here: grid items must stretch so cell backgrounds paint the
        // full row height (a 20px-tall centered cell would double-paint the middle).
        'group grid transition-colors',
        !bare && 'border-b border-line last:border-b-0',
        !bare && hoverable && !selected && 'hover:bg-sunken',
        !bare && selected && 'bg-brand-subtle hover:bg-brand-subtle',
        className,
      )}
      style={{ gridTemplateColumns: gridTemplateColumns ?? 'var(--table-cols)', ...style }}
      {...props}
    />
  );
}

function isFlexibleColumn<T>(column: TableColumn<T>, resizedWidth?: number): boolean {
  if (resizedWidth !== undefined) return false;
  if (column.width === undefined) return true;
  if (typeof column.width === 'string') {
    return /(fr|auto)/.test(column.width);
  }
  return false;
}

function columnTrack<T>(column: TableColumn<T>, width?: number, fill = false): string {
  if (width !== undefined) return fill ? `minmax(${String(width)}px, 1fr)` : `${String(width)}px`;
  if (typeof column.width === 'number') {
    return fill ? `minmax(${String(column.width)}px, 1fr)` : `${String(column.width)}px`;
  }
  if (typeof column.width === 'string') return column.width;
  return 'minmax(160px, 1fr)';
}

interface ColumnSettingsProps<T> {
  columns: TableColumn<T>[];
  hiddenColumnIds: string[];
  onHiddenColumnIdsChange: (ids: string[]) => void;
  onColumnOrderChange: (ids: string[]) => void;
  portalContainer?: HTMLElement | null;
  label?: string;
}

function SortableColumnItem<T>({
  column,
  checked,
  disabled,
  onCheckedChange,
}: {
  column: TableColumn<T>;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1 text-caption text-fg-primary',
        isDragging && 'bg-sunken shadow-sm',
      )}
    >
      <button
        type="button"
        aria-label="Перетащить"
        className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface hover:text-fg-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Switch
        label={typeof column.header === 'string' ? column.header : column.id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="flex-1 justify-between"
      />
    </div>
  );
}

function ColumnSettings<T>({
  columns,
  hiddenColumnIds,
  onHiddenColumnIdsChange,
  onColumnOrderChange,
  portalContainer,
  label = 'Настроить колонки',
}: ColumnSettingsProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = useMemo(() => columns.map((column) => column.id), [columns]);
  const hiddenSet = useMemo(() => new Set(hiddenColumnIds), [hiddenColumnIds]);
  const visibleCount = columns.length - hiddenSet.size;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    onColumnOrderChange(arrayMove(items, oldIndex, newIndex));
  };

  const toggleColumn = (id: string, checked: boolean) => {
    const next = checked ? hiddenColumnIds.filter((item) => item !== id) : [...hiddenColumnIds, id];
    onHiddenColumnIdsChange(next);
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          type="button"
          aria-label={label}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
        >
          <Settings2 className="size-4" />
        </button>
      </DropdownTrigger>
      <DropdownContent portalContainer={portalContainer} align="end" className="w-64 p-2">
        <div className="mb-2 px-2 text-body-s font-bold text-fg-primary">Колонки</div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {columns.map((column) => {
                const checked = !hiddenSet.has(column.id);
                const disabled = visibleCount === 1 && checked;
                return (
                  <SortableColumnItem
                    key={column.id}
                    column={column}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(value) => {
                      toggleColumn(column.id, value);
                    }}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </DropdownContent>
    </Dropdown>
  );
}

/** Universal table: optional selection, sorting and a row-actions menu, resizable columns. */
function Table<T>({
  data,
  columns,
  rowKey,
  selectable = false,
  selectedIds,
  defaultSelectedIds,
  onSelectedIdsChange,
  sort,
  defaultSort = null,
  onSortChange,
  actions,
  headerActions,
  actionLabel = 'Действия',
  loading = false,
  empty,
  caption,
  onRowClick,
  portalContainer,
  className,
  showColumnSettings = false,
  columnSettingsLabel,
  hiddenColumnIds,
  defaultHiddenColumnIds,
  onHiddenColumnIdsChange,
  columnOrder,
  defaultColumnOrder,
  onColumnOrderChange,
}: TableProps<T>) {
  const [innerSelectedIds, setInnerSelectedIds] = useState<(string | number)[]>(
    defaultSelectedIds ?? [],
  );
  const [innerSort, setInnerSort] = useState<TableSort | null>(defaultSort);
  const [resizedWidths, setResizedWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ columnId: string; startWidth: number; startX: number } | null>(null);

  const [innerHiddenColumnIds, setInnerHiddenColumnIds] = useState<string[]>(
    defaultHiddenColumnIds ?? [],
  );
  const [innerColumnOrder, setInnerColumnOrder] = useState<string[]>(
    defaultColumnOrder ?? columns.map((column) => column.id),
  );

  const isControlledSelection = selectedIds !== undefined;
  const selected = isControlledSelection ? selectedIds : innerSelectedIds;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const isControlledSort = sort !== undefined;
  const activeSort = isControlledSort ? sort : innerSort;

  const isControlledHidden = hiddenColumnIds !== undefined;
  const activeHiddenColumnIds = isControlledHidden ? hiddenColumnIds : innerHiddenColumnIds;

  const isControlledOrder = columnOrder !== undefined;
  const activeColumnOrder = isControlledOrder ? columnOrder : innerColumnOrder;

  const setHiddenColumnIds = (ids: string[]) => {
    if (!isControlledHidden) setInnerHiddenColumnIds(ids);
    onHiddenColumnIdsChange?.(ids);
  };

  const setColumnOrder = (ids: string[]) => {
    if (!isControlledOrder) setInnerColumnOrder(ids);
    onColumnOrderChange?.(ids);
  };

  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((column) => [column.id, column]));
    const ordered = activeColumnOrder
      .map((id) => byId.get(id))
      .filter((column): column is TableColumn<T> => column !== undefined);
    const rest = columns.filter((column) => !activeColumnOrder.includes(column.id));
    return [...ordered, ...rest];
  }, [columns, activeColumnOrder]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => !activeHiddenColumnIds.includes(column.id)),
    [orderedColumns, activeHiddenColumnIds],
  );

  const hasFlexibleVisibleColumn = visibleColumns.some((column) =>
    isFlexibleColumn(column, resizedWidths[column.id]),
  );

  const hasActionsColumn = actions ?? showColumnSettings;

  const template = useMemo(() => {
    const tracks = visibleColumns.map((column, index) => {
      const isLast = index === visibleColumns.length - 1;
      const fill = !hasFlexibleVisibleColumn && isLast;
      return columnTrack(column, resizedWidths[column.id], fill);
    });
    return [...(selectable ? ['44px'] : []), ...tracks, ...(hasActionsColumn ? ['48px'] : [])].join(
      ' ',
    );
  }, [visibleColumns, selectable, hasActionsColumn, resizedWidths, hasFlexibleVisibleColumn]);

  const sortedData = useMemo(() => {
    if (!activeSort) return data;
    const column = columns.find((item) => item.id === activeSort.columnId);
    if (!column?.sortable) return data;
    const read = column.accessor ?? (() => undefined);
    const factor = activeSort.direction === 'asc' ? 1 : -1;
    const compare =
      column.sortCompare ??
      ((a: T, b: T) => compareValues(read(a), read(b), column.sortType ?? 'string'));
    return [...data].sort((a, b) => factor * compare(a, b));
  }, [data, columns, activeSort]);

  const toggleSort = (column: TableColumn<T>) => {
    if (!column.sortable || loading) return;
    const next: TableSort | null =
      activeSort?.columnId === column.id
        ? activeSort.direction === 'asc'
          ? { columnId: column.id, direction: 'desc' }
          : null
        : { columnId: column.id, direction: 'asc' };
    if (!isControlledSort) setInnerSort(next);
    onSortChange?.(next);
  };

  const setSelection = (ids: (string | number)[]) => {
    if (!isControlledSelection) setInnerSelectedIds(ids);
    onSelectedIdsChange?.(ids);
  };

  const toggleRow = (key: string | number) => {
    setSelection(selectedSet.has(key) ? selected.filter((id) => id !== key) : [...selected, key]);
  };

  const keys = data.map(rowKey);
  const everySelected = keys.length > 0 && keys.every((key) => selectedSet.has(key));
  const someSelected = keys.some((key) => selectedSet.has(key));

  const startResize = (event: PointerEvent<HTMLDivElement>, column: TableColumn<T>) => {
    const header = event.currentTarget.parentElement;
    if (!header) return;
    resizeRef.current = {
      columnId: column.id,
      startWidth: header.offsetWidth,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state) return;
    const width = Math.max(
      MIN_COLUMN_WIDTH,
      Math.round(state.startWidth + event.clientX - state.startX),
    );
    setResizedWidths((prev) => ({ ...prev, [state.columnId]: width }));
  };

  const endResize = () => {
    resizeRef.current = null;
  };

  const alignClass = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
  } as const;

  const headerClass = cn(
    'relative flex h-10 items-center gap-1 px-3 text-micro font-bold tracking-wider',
    // fg-secondary, not fg-muted: the header sits on bg-sunken, where muted is 4.43:1 (fails AA for 12px text)
    'bg-sunken text-fg-secondary uppercase select-none',
  );

  return (
    <div
      role="table"
      aria-label={caption}
      aria-busy={loading || undefined}
      data-slot="table"
      // scrollable by keyboard when the columns overflow the container (scrollable-region-focusable)
      tabIndex={0}
      className={cn(
        'overflow-x-auto overflow-y-hidden rounded-xl border border-line bg-surface',
        className,
      )}
      style={{ '--table-cols': template, minWidth: '100%' } as CSSProperties}
    >
      {/* header — the sunken background lives on the cells, not the row: rows stretch to the
            scrollport width, so a row-level background would leave an unpainted strip (white)
            on the right once the table scrolls horizontally. Cell backgrounds paint the full
            grid track area instead. Same reason for the cell-level hover/selected backgrounds
            in the body rows below. */}
      <div role="row" className="grid" style={{ gridTemplateColumns: 'var(--table-cols)' }}>
        {selectable ? (
          <div role="columnheader" className={cn(headerClass, 'px-3')}>
            <span className="sr-only">Выбор строк</span>
            <Checkbox
              aria-label="Выбрать все"
              checked={everySelected}
              indeterminate={someSelected && !everySelected}
              disabled={loading}
              onCheckedChange={() => {
                setSelection(everySelected ? [] : keys);
              }}
            />
          </div>
        ) : null}
        {visibleColumns.map((column) => {
          const sortedAsc = activeSort?.columnId === column.id && activeSort.direction === 'asc';
          const sortedDesc = activeSort?.columnId === column.id && activeSort.direction === 'desc';
          const content = (
            <>
              <span className="truncate">{column.header}</span>
              {column.sortable ? (
                sortedAsc ? (
                  <ArrowUp className="size-3 shrink-0 text-brand-text" />
                ) : sortedDesc ? (
                  <ArrowDown className="size-3 shrink-0 text-brand-text" />
                ) : (
                  <ArrowUpDown className="size-3 shrink-0" />
                )
              ) : null}
            </>
          );
          return (
            <div
              key={column.id}
              role="columnheader"
              aria-sort={sortedAsc ? 'ascending' : sortedDesc ? 'descending' : 'none'}
              className={cn(
                headerClass,
                alignClass[column.align ?? 'left'],
                (sortedAsc || sortedDesc) && 'text-fg-primary',
                column.sortable && 'cursor-pointer hover:text-fg-primary',
              )}
              onClick={() => {
                toggleSort(column);
              }}
            >
              {column.sortable ? (
                <button
                  type="button"
                  disabled={loading}
                  className="flex min-w-0 items-center gap-1 uppercase outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSort(column);
                  }}
                >
                  {content}
                </button>
              ) : (
                content
              )}
              <div
                role="presentation"
                aria-hidden
                className={cn(
                  'absolute top-1/2 right-0 h-5 w-2 -translate-y-1/2 cursor-col-resize touch-none',
                  loading && 'pointer-events-none',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  startResize(event, column);
                }}
                onPointerMove={moveResize}
                onPointerUp={endResize}
              >
                <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-brand-primary" />
              </div>
            </div>
          );
        })}
        {hasActionsColumn ? (
          <div role="columnheader" className={cn(headerClass, 'justify-end gap-2 px-3')}>
            <span className="sr-only">{actionLabel}</span>
            {showColumnSettings ? (
              <ColumnSettings
                columns={orderedColumns}
                hiddenColumnIds={activeHiddenColumnIds}
                onHiddenColumnIdsChange={setHiddenColumnIds}
                onColumnOrderChange={setColumnOrder}
                portalContainer={portalContainer}
                label={columnSettingsLabel}
              />
            ) : null}
            {headerActions}
          </div>
        ) : null}
      </div>

      {/* body */}
      {loading ? (
        Array.from({ length: 5 }, (_, rowIndex) => (
          <TableRow key={rowIndex} bare className="h-11" hoverable={false} aria-hidden>
            {selectable ? (
              <div
                role="cell"
                className={cn(
                  'flex items-center px-3',
                  rowIndex === 4 ? 'border-b-0' : 'border-b border-line',
                )}
              >
                <Skeleton className="size-5" />
              </div>
            ) : null}
            {visibleColumns.map((column, columnIndex) => (
              <div
                key={column.id}
                role="cell"
                className={cn(
                  'flex items-center px-3',
                  rowIndex === 4 ? 'border-b-0' : 'border-b border-line',
                )}
              >
                <Skeleton className={cn('h-4', columnIndex % 3 === 0 ? 'w-3/4' : 'w-1/2')} />
              </div>
            ))}
            {hasActionsColumn ? (
              <div role="cell" className={rowIndex === 4 ? 'border-b-0' : 'border-b border-line'} />
            ) : null}
          </TableRow>
        ))
      ) : sortedData.length === 0 ? (
        <TableRow bare hoverable={false}>
          {/* Block cell, not flex: the empty content centers itself and must stretch
                to the full spanned width instead of shrinking to a flex item. */}
          <div role="cell" style={{ gridColumn: '1 / -1' }}>
            {empty}
          </div>
        </TableRow>
      ) : (
        sortedData.map((row, rowIndex) => {
          const key = rowKey(row);
          const isSelected = selectedSet.has(key);
          const rowActions = typeof actions === 'function' ? actions(row) : actions;
          // All decoration lives on the cells, none on the row: a row is only as wide as the
          // scrollport, so a row-level background/border would cut off on the right in a
          // horizontally scrolled table, and would double-paint over the cell backgrounds.
          const cellRowBg = isSelected
            ? 'bg-brand-subtle group-hover:bg-brand-primary/20'
            : 'group-hover:bg-sunken';
          // last: would match the actions cell of EVERY row (each cell is a last-child of its
          // own row), so the border omission for the table's last row is explicit instead.
          const cellBorder =
            rowIndex === sortedData.length - 1 ? 'border-b-0' : 'border-b border-line';
          return (
            <TableRow
              key={key}
              bare
              selected={isSelected}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                'h-11',
                onRowClick &&
                  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
              )}
              onClick={() => {
                onRowClick?.(row);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {selectable ? (
                <div
                  role="cell"
                  className={cn('flex items-center px-3 transition-colors', cellBorder, cellRowBg)}
                >
                  <Checkbox
                    aria-label="Выбрать строку"
                    checked={isSelected}
                    onCheckedChange={() => {
                      toggleRow(key);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  />
                </div>
              ) : null}
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  role="cell"
                  className={cn(
                    'flex min-w-0 items-center px-3 text-body-s text-fg-primary transition-colors',
                    alignClass[column.align ?? 'left'],
                    cellBorder,
                    cellRowBg,
                  )}
                >
                  {column.cell ? (
                    <span className="truncate">{column.cell(row, rowIndex)}</span>
                  ) : column.accessor ? (
                    // Full text as a native tooltip: the visible value is truncated with an
                    // ellipsis, so hover should reveal what did not fit.
                    <span className="truncate" title={String(column.accessor(row))}>
                      {String(column.accessor(row))}
                    </span>
                  ) : null}
                </div>
              ))}
              {hasActionsColumn ? (
                <div
                  role="cell"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  className={cn(
                    'flex items-center justify-end px-3 transition-colors',
                    cellBorder,
                    cellRowBg,
                  )}
                >
                  {rowActions ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <button
                          type="button"
                          aria-label={actionLabel}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownTrigger>
                      <DropdownContent portalContainer={portalContainer} align="end">
                        {rowActions.map((action) => (
                          <DropdownItem
                            key={action.label}
                            danger={action.danger}
                            onSelect={() => {
                              action.onSelect(row);
                            }}
                          >
                            {action.icon ? (
                              <action.icon className="size-3.5 text-fg-muted" />
                            ) : null}
                            {action.label}
                          </DropdownItem>
                        ))}
                      </DropdownContent>
                    </Dropdown>
                  ) : null}
                </div>
              ) : null}
            </TableRow>
          );
        })
      )}
    </div>
  );
}

export {
  Table,
  TableRow,
  tableSortTypes,
  type TableAction,
  type TableColumn,
  type TableProps,
  type TableRowProps,
  type TableSort,
  type TableSortDirection,
  type TableSortType,
};
