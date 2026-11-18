import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table } from './table';
import type { TableColumn } from './table';

interface Task {
  id: string;
  title: string;
  priority: number;
  due: string;
  done: boolean;
}

const tasks: Task[] = [
  { id: 'PL-42', title: 'Двойной вызов useEffect', priority: 3, due: '2026-11-14', done: false },
  { id: 'PL-38', title: 'Webhook GitHub', priority: 1, due: '2026-11-13', done: true },
  { id: 'PL-45', title: 'Экран пустого канбана', priority: 2, due: '2026-11-17', done: false },
];

const columns: TableColumn<Task>[] = [
  { id: 'id', header: 'ID', accessor: (task) => task.id, width: 80 },
  { id: 'title', header: 'Задача', accessor: (task) => task.title, sortable: true },
  {
    id: 'priority',
    header: 'Приоритет',
    accessor: (task) => task.priority,
    sortable: true,
    sortType: 'number',
  },
  { id: 'due', header: 'Срок', accessor: (task) => task.due, sortable: true, sortType: 'date' },
];

function renderTable(override: Partial<Parameters<typeof Table<Task>>[0]> = {}) {
  return render(
    <Table<Task>
      data={tasks}
      columns={columns}
      rowKey={(task) => task.id}
      caption="Задачи"
      {...override}
    />,
  );
}

function columnHeader(name: string) {
  return screen.getByRole('columnheader', { name: new RegExp(name, 'i') });
}

function bodyRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

describe('Table', () => {
  it('renders a semantic table with columns and accessor cells', () => {
    renderTable();
    expect(screen.getByRole('table', { name: 'Задачи' })).toBeInTheDocument();
    expect(columnHeader('ID')).toBeInTheDocument();
    expect(screen.getByText('Двойной вызов useEffect')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
  });

  it('cycles a sortable column through asc → desc → reset', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ onSortChange });

    const header = columnHeader('Задача');
    expect(header).toHaveAttribute('aria-sort', 'none');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'title', direction: 'asc' });

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(bodyRows()).toHaveLength(3);
  });

  it('respects a controlled sort value', () => {
    renderTable({ sort: { columnId: 'priority', direction: 'desc' } });
    expect(columnHeader('Приоритет')).toHaveAttribute('aria-sort', 'descending');
    // desc by priority: 3 (Двойной вызов) first
    expect(bodyRows()[0]!).toHaveTextContent('Двойной вызов useEffect');
  });

  it('does not render a sort button for a non-sortable column', () => {
    renderTable();
    expect(within(columnHeader('ID')).queryByRole('button')).toBeNull();
  });

  it('sorts numbers and dates by their sort types', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTable();
    await user.click(within(columnHeader('Приоритет')).getByRole('button'));
    expect(bodyRows()[0]!).toHaveTextContent('Webhook GitHub'); // priority 1
    unmount();

    renderTable();
    await user.click(within(columnHeader('Срок')).getByRole('button'));
    expect(bodyRows()[0]!).toHaveTextContent('Webhook GitHub'); // due 2026-11-13
  });

  it('sorts with a custom sortCompare instead of sortType', () => {
    // custom comparator sorts by priority descending, so table "ascending" yields 3 → 2 → 1
    const customColumns: TableColumn<Task>[] = [
      {
        id: 'priority',
        header: 'Приоритет',
        accessor: (task) => task.priority,
        sortable: true,
        sortCompare: (a, b) => b.priority - a.priority,
      },
    ];
    const ranked: Task[] = [
      { id: 'A', title: 'mid task', priority: 2, due: '2026-11-10', done: false },
      { id: 'B', title: 'high task', priority: 3, due: '2026-11-11', done: false },
      { id: 'C', title: 'low task', priority: 1, due: '2026-11-12', done: false },
    ];
    render(
      <Table<Task>
        data={ranked}
        columns={customColumns}
        rowKey={(task) => task.id}
        caption="Ранги"
        defaultSort={{ columnId: 'priority', direction: 'asc' }}
      />,
    );
    // custom ascending: priority 3 → 2 → 1 (the reverse of the raw-number order)
    expect(bodyRows()[0]!).toHaveTextContent('3');
    expect(bodyRows()[1]!).toHaveTextContent('2');
    expect(bodyRows()[2]!).toHaveTextContent('1');
  });

  it('selects rows by id and reports through onSelectedIdsChange', async () => {
    const user = userEvent.setup();
    const onSelectedIdsChange = vi.fn();
    renderTable({ selectable: true, onSelectedIdsChange });

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: 'Выбрать строку' });
    await user.click(rowCheckboxes[0]!);
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['PL-42']);
    expect(bodyRows()[0]!).toHaveAttribute('aria-selected', 'true');
  });

  it('selects all rows and shows an indeterminate header checkbox on partial selection', async () => {
    const user = userEvent.setup();
    renderTable({ selectable: true, defaultSelectedIds: ['PL-42'] });

    const selectAll = screen.getByRole('checkbox', { name: 'Выбрать все' });
    expect(selectAll).toHaveAttribute('data-state', 'indeterminate');

    await user.click(selectAll);
    expect(selectAll).toHaveAttribute('data-state', 'checked');
    expect(screen.getAllByRole('checkbox', { name: 'Выбрать строку' })).toHaveLength(3);

    await user.click(selectAll);
    expect(selectAll).toHaveAttribute('data-state', 'unchecked');
    expect(bodyRows().every((row) => !row.hasAttribute('aria-selected'))).toBe(true);
  });

  it('opens a row actions menu and calls onSelect with the row', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderTable({
      actions: [
        { label: 'Редактировать', onSelect: onEdit },
        { label: 'Удалить', danger: true, onSelect: vi.fn() },
      ],
    });

    const triggers = screen.getAllByRole('button', { name: 'Действия' });
    await user.click(triggers[1]!);

    const menu = screen.getByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: 'Редактировать' }));
    expect(onEdit).toHaveBeenCalledWith(tasks[1]);
  });

  it('renders the empty state row when there is no data', () => {
    renderTable({ data: [], empty: <p>Ничего не найдено</p> });
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('renders skeleton rows and aria-busy while loading', () => {
    const { container } = renderTable({ loading: true });
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('disables all header interactions while loading', () => {
    renderTable({ loading: true, selectable: true });
    expect(screen.getByRole('checkbox', { name: 'Выбрать все' })).toBeDisabled();
    for (const name of ['Задача', 'Приоритет', 'Срок']) {
      expect(within(columnHeader(name)).getByRole('button')).toBeDisabled();
    }
  });

  it('does not add the hover effect to skeleton and empty state rows', () => {
    const { container, rerender } = renderTable({ loading: true });
    expect(container.querySelector('[data-slot="table-row"]')).not.toHaveClass('hover:bg-sunken');
    rerender(
      <Table<Task>
        data={[]}
        columns={columns}
        rowKey={(task) => task.id}
        empty={<p>Ничего не найдено</p>}
      />,
    );
    expect(
      screen.getByText('Ничего не найдено').closest('[data-slot="table-row"]'),
    ).not.toHaveClass('hover:bg-sunken');
  });

  it('paints backgrounds on cells, not rows, so horizontal scrolling leaves no unpainted strip', () => {
    renderTable();
    const headerRow = document.querySelector('[role="row"]');
    expect(headerRow).not.toHaveClass('bg-sunken');
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveClass('bg-sunken');
    }
    const firstCell = screen.getAllByRole('cell')[0];
    expect(firstCell).toHaveClass('group-hover:bg-sunken');
    // Body rows are bare: borders and backgrounds live on the cells, so a horizontally
    // scrolled table keeps an uninterrupted border line and a uniform row background.
    const bodyRow = screen.getAllByRole('row')[1]!;
    expect(bodyRow).not.toHaveClass(
      'border-b',
      'border-line',
      'bg-brand-subtle',
      'hover:bg-sunken',
    );
    for (const cell of within(bodyRow).getAllByRole('cell')) {
      expect(cell).toHaveClass('border-b', 'border-line');
    }
    // A selected row keeps a visible hover accent on its cells.
    renderTable({ selectable: true, defaultSelectedIds: ['PL-42'] });
    const secondTable = within(screen.getAllByRole('table')[1]!);
    const selectedRow = secondTable.getAllByRole('row')[1]!;
    for (const cell of within(selectedRow).getAllByRole('cell')) {
      expect(cell).toHaveClass('bg-brand-subtle', 'group-hover:bg-brand-primary/20');
    }
  });

  it('exposes the full cell text via title when the value can be truncated', () => {
    renderTable();
    const cell = screen.getByText('Двойной вызов useEffect');
    expect(cell).toHaveAttribute('title', 'Двойной вызов useEffect');
    expect(cell.className).toContain('truncate');
  });

  it('resizes a column by dragging the header edge', () => {
    renderTable();
    const handle = document.querySelector('[role="presentation"]');
    expect(handle).not.toBeNull();

    fireEvent.pointerDown(handle!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle!, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(handle!, { pointerId: 1 });

    const grid = screen.getByRole('table');
    // jsdom offsetWidth is 0, so the width clamps to the 64 px minimum
    expect(grid.getAttribute('style')).toContain('64px');
  });

  it('renders a column settings trigger when showColumnSettings is set', async () => {
    const user = userEvent.setup();
    renderTable({ showColumnSettings: true });

    const trigger = screen.getByRole('button', { name: 'Настроить колонки' });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole('switch', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Задача' })).toBeInTheDocument();
  });

  it('hides a column via the settings menu and reports the change', async () => {
    const user = userEvent.setup();
    const onHiddenColumnIdsChange = vi.fn();
    renderTable({ showColumnSettings: true, onHiddenColumnIdsChange });

    await user.click(screen.getByRole('button', { name: 'Настроить колонки' }));
    await user.click(screen.getByRole('switch', { name: 'ID' }));
    await user.keyboard('{Escape}');

    expect(onHiddenColumnIdsChange).toHaveBeenLastCalledWith(['id']);
    expect(screen.getByRole('columnheader', { name: /Задача/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /ID/i })).toBeNull();
  });

  it('disables the last visible column switch in the settings menu', async () => {
    const user = userEvent.setup();
    renderTable({
      showColumnSettings: true,
      defaultHiddenColumnIds: ['title', 'priority', 'due'],
    });

    await user.click(screen.getByRole('button', { name: 'Настроить колонки' }));
    expect(screen.getByRole('switch', { name: 'ID' })).toBeDisabled();
  });

  it('renders columns in the controlled order prop', () => {
    renderTable({ columnOrder: ['due', 'title', 'id', 'priority'] });
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Срок', 'Задача', 'ID', 'Приоритет']);
  });

  it('fills the table width when all visible columns have fixed widths', () => {
    const fixedColumns: TableColumn<Task>[] = [
      { id: 'id', header: 'ID', accessor: (task) => task.id, width: 80 },
      { id: 'title', header: 'Title', accessor: (task) => task.title, width: 120 },
    ];
    render(
      <Table<Task>
        data={tasks}
        columns={fixedColumns}
        rowKey={(task) => task.id}
        caption="Fixed"
      />,
    );
    const grid = screen.getByRole('table');
    // The last visible fixed-width column is made flexible so the grid fills the container.
    expect(grid.getAttribute('style')).toContain('minmax(120px, 1fr)');
  });
});
