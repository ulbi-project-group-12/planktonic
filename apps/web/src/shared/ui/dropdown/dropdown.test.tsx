import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

function renderOpen(onSelect = vi.fn(), onOpenChange = vi.fn()) {
  render(
    <Dropdown open onOpenChange={onOpenChange}>
      <DropdownTrigger>
        <Button size="s" variant="secondary">
          Меню
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Сортировка</DropdownLabel>
        <DropdownItem onSelect={onSelect}>Ответить в ветке</DropdownItem>
        <DropdownItem danger onSelect={onSelect}>
          Удалить сообщение
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem disabled>Удалить</DropdownItem>
      </DropdownContent>
    </Dropdown>,
  );
  return { onSelect, onOpenChange };
}

/** Uncontrolled menu for keyboard interaction tests. */
function renderMenu() {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <Dropdown onOpenChange={onOpenChange}>
      <DropdownTrigger>
        <Button size="s" variant="secondary">
          Меню
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onSelect={onSelect}>Ответить в ветке</DropdownItem>
        <DropdownItem danger onSelect={onSelect}>
          Удалить сообщение
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem disabled>Удалить</DropdownItem>
      </DropdownContent>
    </Dropdown>,
  );
  return { onSelect, onOpenChange };
}

describe('Dropdown', () => {
  it('opens the menu with items', () => {
    renderOpen();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ответить в ветке' })).toBeInTheDocument();
    expect(screen.getByText('Сортировка')).toBeInTheDocument();
  });

  it('fires onSelect and closes', async () => {
    const { onSelect, onOpenChange } = renderOpen();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ответить в ветке' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('marks a danger item', () => {
    renderOpen();
    expect(screen.getByRole('menuitem', { name: 'Удалить сообщение' })).toHaveClass('text-danger');
  });

  it('disables an item', () => {
    renderOpen();
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

describe('Dropdown (клавиатура и Escape)', () => {
  it('opens with Enter and moves focus to the first item', async () => {
    renderMenu();
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ответить в ветке' })).toHaveFocus();
  });

  it('opens with ArrowDown on the trigger', async () => {
    renderMenu();
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('walks the items with arrows, skipping the disabled one', async () => {
    renderMenu();
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{Enter}');
    const first = screen.getByRole('menuitem', { name: 'Ответить в ветке' });
    const second = screen.getByRole('menuitem', { name: 'Удалить сообщение' });
    expect(first).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();
    // the disabled 'Удалить' is skipped — focus stays on the last enabled item (no loop)
    await userEvent.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const { onOpenChange } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Меню' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(trigger).toHaveFocus();
  });

  it('selects an item with Enter and closes', async () => {
    const { onSelect } = renderMenu();
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('toggles a checkbox item with Space', async () => {
    const onCheckedChange = vi.fn();
    render(
      <Dropdown>
        <DropdownTrigger>
          <Button size="s" variant="secondary">
            Меню
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Сначала новые
          </DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>,
    );
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{Enter}');
    const item = screen.getByRole('menuitemcheckbox', { name: 'Сначала новые' });
    expect(item).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('opens a nested submenu with ArrowRight', async () => {
    render(
      <Dropdown>
        <DropdownTrigger>
          <Button size="s" variant="secondary">
            Меню
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Переименовать</DropdownItem>
          <DropdownSub>
            <DropdownSubTrigger>Переместить</DropdownSubTrigger>
            <DropdownSubContent>
              <DropdownItem>В архив</DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
        </DropdownContent>
      </Dropdown>,
    );
    screen.getByRole('button', { name: 'Меню' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}'); // onto the submenu trigger
    expect(screen.getByRole('menuitem', { name: 'Переместить' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(await screen.findByRole('menuitem', { name: 'В архив' })).toBeInTheDocument();
  });
});
