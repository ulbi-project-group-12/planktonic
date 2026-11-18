/** Demo data and column builders for Table stories.
    Lives outside *.stories so Storybook does not treat the exports as stories. */
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Avatar } from '@/shared/ui/avatar';
import { Chip } from '@/shared/ui/chip';
import type { TableAction, TableColumn } from './table';

export type TaskStatus = 'В работе' | 'На проверке' | 'Нужно сделать' | 'Готово';
export type TaskPriority = 'Высокий' | 'Средний' | 'Низкий';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  /** ISO date — the sort value; the cell shows "14 ноя". */
  due: string | null;
  updated: string;
}

export const TASKS: Task[] = [
  {
    id: 'PL-42',
    title: 'Двойной вызов useEffect в канбане',
    status: 'В работе',
    priority: 'Высокий',
    assignee: 'Мария С.',
    due: '2026-11-14',
    updated: '2 ч назад',
  },
  {
    id: 'PL-38',
    title: 'Webhook GitHub: проверка подписи',
    status: 'На проверке',
    priority: 'Высокий',
    assignee: 'Дмитрий Л.',
    due: '2026-11-13',
    updated: '5 ч назад',
  },
  {
    id: 'PL-45',
    title: 'Экран пустого канбана',
    status: 'Нужно сделать',
    priority: 'Средний',
    assignee: 'Александр К.',
    due: '2026-11-17',
    updated: 'вчера',
  },
  {
    id: 'PL-31',
    title: 'Индикатор набора в ветке',
    status: 'В работе',
    priority: 'Низкий',
    assignee: 'Александр К.',
    due: '2026-11-15',
    updated: 'вчера',
  },
  {
    id: 'PL-27',
    title: 'Настройка правил GitHub → статусы',
    status: 'Готово',
    priority: 'Средний',
    assignee: 'Мария С.',
    due: '2026-11-10',
    updated: '2 дня назад',
  },
  {
    id: 'PL-58',
    title: 'Skeleton для ленты сообщений',
    status: 'В работе',
    priority: 'Средний',
    assignee: 'Александр К.',
    due: '2026-11-18',
    updated: '3 дня назад',
  },
  {
    id: 'PL-52',
    title: 'Правила авто-статусов для GitHub',
    status: 'Нужно сделать',
    priority: 'Низкий',
    assignee: 'Дмитрий Л.',
    due: null,
    updated: '3 дня назад',
  },
  {
    id: 'PL-18',
    title: 'Диагностика доставки уведомлений',
    status: 'Готово',
    priority: 'Низкий',
    assignee: 'Александр К.',
    due: '2026-11-07',
    updated: 'неделю назад',
  },
  {
    id: 'PL-61',
    title: 'Перенос чата на WebSocket',
    status: 'В работе',
    priority: 'Высокий',
    assignee: 'Дмитрий Л.',
    due: '2026-11-20',
    updated: '3 ч назад',
  },
  {
    id: 'PL-60',
    title: 'Тултип у аватара в шапке',
    status: 'Нужно сделать',
    priority: 'Низкий',
    assignee: 'Мария С.',
    due: '2026-11-24',
    updated: '4 ч назад',
  },
  {
    id: 'PL-59',
    title: 'Оффлайн-индикатор в списке каналов',
    status: 'На проверке',
    priority: 'Средний',
    assignee: 'Александр К.',
    due: '2026-11-19',
    updated: '6 ч назад',
  },
  {
    id: 'PL-56',
    title: 'Пагинация в поиске по сообщениям',
    status: 'В работе',
    priority: 'Средний',
    assignee: 'Мария С.',
    due: '2026-11-21',
    updated: 'вчера',
  },
  {
    id: 'PL-55',
    title: 'Экспорт истории канала в Markdown',
    status: 'Нужно сделать',
    priority: 'Низкий',
    assignee: 'Дмитрий Л.',
    due: null,
    updated: '2 дня назад',
  },
  {
    id: 'PL-53',
    title: 'Подсветка упоминаний в ленте',
    status: 'На проверке',
    priority: 'Средний',
    assignee: 'Мария С.',
    due: '2026-11-18',
    updated: '2 дня назад',
  },
  {
    id: 'PL-49',
    title: 'Дедупликация событий реакций',
    status: 'Готово',
    priority: 'Высокий',
    assignee: 'Александр К.',
    due: '2026-11-12',
    updated: '4 дня назад',
  },
];

const statusChip: Record<
  TaskStatus,
  { palette?: 'info' | 'warning' | 'success'; neutral?: boolean }
> = {
  'В работе': { palette: 'info' },
  'На проверке': { palette: 'warning' },
  'Нужно сделать': { neutral: true },
  Готово: { palette: 'success' },
};

const priorityClass: Record<TaskPriority, string> = {
  Высокий: 'text-danger',
  Средний: 'text-warning-hover dark:text-warning',
  Низкий: 'text-fg-secondary',
};

function formatDue(task: Task): string {
  if (!task.due) return '—';
  return new Date(task.due).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function buildColumns(): TableColumn<Task>[] {
  return [
    {
      id: 'id',
      header: 'ID',
      accessor: (task) => Number(task.id.replace('PL-', '')),
      sortable: true,
      sortType: 'number',
      width: 90,
    },
    { id: 'title', header: 'Задача', accessor: (task) => task.title, sortable: true },
    {
      id: 'status',
      header: 'Статус',
      cell: (task) => {
        const chip = statusChip[task.status];
        return chip.neutral ? (
          <Chip fill="neutral">{task.status}</Chip>
        ) : (
          <Chip palette={chip.palette} fill="subtle">
            {task.status}
          </Chip>
        );
      },
    },
    {
      id: 'priority',
      header: 'Приоритет',
      cell: (task) => <span className={priorityClass[task.priority]}>{task.priority}</span>,
    },
    {
      id: 'assignee',
      header: 'Исполнитель',
      cell: (task) => (
        <span className="flex items-center gap-2">
          <Avatar name={task.assignee} size="s" />
          {task.assignee}
        </span>
      ),
    },
    {
      id: 'due',
      header: 'Срок',
      accessor: (task) => task.due,
      cell: (task) => formatDue(task),
      sortable: true,
      sortType: 'date',
      width: 110,
    },
    {
      id: 'updated',
      header: 'Обновлено',
      accessor: (task) => task.updated,
      sortable: true,
      width: 140,
    },
  ];
}

export const rowActions: TableAction<Task>[] = [
  { label: 'Редактировать', icon: Pencil, onSelect: () => undefined },
  { label: 'Копировать ссылку', icon: Copy, onSelect: () => undefined },
  { label: 'Удалить', icon: Trash2, danger: true, onSelect: () => undefined },
];
