import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, type TabItem } from './tabs';

const tabs: TabItem[] = [
  { value: 'discussions', label: 'Обсуждения' },
  { value: 'tasks', label: 'Задачи', count: 12 },
  { value: 'archive', label: 'Архив', disabled: true },
];

describe('Tabs', () => {
  it('marks the active tab', () => {
    render(<Tabs tabs={tabs} value="tasks" onValueChange={vi.fn()} />);
    const active = screen.getByRole('tab', { name: /Задачи/ });
    expect(active).toHaveAttribute('data-state', 'active');
    expect(active).toHaveAttribute('aria-selected', 'true');
  });

  it('shows a count next to the label', () => {
    render(<Tabs tabs={tabs} value="tasks" onValueChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Задачи/ })).toHaveTextContent('12');
  });

  it('switches the tab via onValueChange', async () => {
    const onValueChange = vi.fn();
    render(<Tabs tabs={tabs} value="tasks" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Обсуждения' }));
    expect(onValueChange).toHaveBeenCalledWith('discussions');
  });

  it('does not switch a disabled tab', async () => {
    const onValueChange = vi.fn();
    render(<Tabs tabs={tabs} value="tasks" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Архив' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('renders the pill variant on a sunken track', () => {
    render(<Tabs tabs={tabs} value="tasks" onValueChange={vi.fn()} variant="pill" />);
    const list = screen.getByRole('tablist');
    expect(list.parentElement).toHaveAttribute('data-variant', 'pill');
    expect(list).toHaveClass('bg-sunken');
  });

  it('links a tab to its panel via aria-controls only when a panelId is given', () => {
    const withPanels: TabItem[] = [
      { value: 'tasks', label: 'Задачи', panelId: 'panel-tasks' },
      { value: 'board', label: 'Канбан' },
    ];
    render(
      <>
        <Tabs tabs={withPanels} value="tasks" onValueChange={vi.fn()} />
        <div id="panel-tasks">Список задач</div>
      </>,
    );
    expect(screen.getByRole('tab', { name: 'Задачи' })).toHaveAttribute(
      'aria-controls',
      'panel-tasks',
    );
    // no panel — no dangling aria-controls (axe broken IDREF)
    expect(screen.getByRole('tab', { name: 'Канбан' })).not.toHaveAttribute('aria-controls');
  });
});
