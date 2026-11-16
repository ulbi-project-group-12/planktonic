import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/shared/ui/button';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
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
