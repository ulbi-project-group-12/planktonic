import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select, type SelectOption } from './select';

const options: SelectOption[] = [
  { value: 'all', label: 'Все участники' },
  { value: 'owner', label: 'Владелец и админы' },
  { value: 'only-owner', label: 'Только владельцы' },
];

describe('Select (одиночный)', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(
      <Select options={options} value={[]} onValueChange={vi.fn()} placeholder="Выберите канал" />,
    );
    expect(screen.getByRole('button', { name: /Выберите канал/ })).toBeInTheDocument();
  });

  it('shows the selected label in the field', () => {
    render(<Select options={options} value={['owner']} onValueChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Владелец и админы/ })).toBeInTheDocument();
  });

  it('opens the dropdown and selects an option', async () => {
    const onValueChange = vi.fn();
    render(<Select options={options} value={[]} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Выберите/ }));
    const option = screen.getByRole('option', { name: 'Только владельцы' });
    expect(option).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith(['only-owner']);
  });

  it('marks the selected option with a check', async () => {
    render(<Select options={options} value={['all']} onValueChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    const option = screen.getByRole('option', { name: 'Все участники' });
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option.querySelector('svg')).not.toBeNull();
  });

  it('moves focus with arrows and selects with Enter', async () => {
    const onValueChange = vi.fn();
    render(<Select options={options} value={[]} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Выберите/ }));
    // фокус при открытии — на первой опции
    expect(screen.getByRole('option', { name: 'Все участники' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Владелец и админы' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('option', { name: 'Только владельцы' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Владелец и админы' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith(['owner']);
  });

  it('selects the focused option with Space', async () => {
    const onValueChange = vi.fn();
    render(<Select options={options} value={[]} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Выберите/ }));
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Space}');
    expect(onValueChange).toHaveBeenCalledWith(['owner']);
  });

  it('focuses the selected option when the dropdown opens', async () => {
    render(<Select options={options} value={['only-owner']} onValueChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Только владельцы/ }));
    expect(screen.getByRole('option', { name: 'Только владельцы' })).toHaveFocus();
  });

  it('filters options by search query', async () => {
    render(<Select options={options} value={[]} onValueChange={vi.fn()} searchable />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByLabelText('Поиск по списку'), 'владел');
    expect(screen.getByRole('option', { name: 'Владелец и админы' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Все участники' })).toBeNull();
    expect(screen.getByText(/Показано/)).toHaveTextContent('Показано 2 из 3 · скролл продолжает');
  });
});

describe('Select (множественный)', () => {
  const many: SelectOption[] = [
    { value: 'pr', label: 'PR открыт' },
    { value: 'review', label: 'Запрос ревью' },
    { value: 'ci', label: 'Результат CI' },
    { value: 'merge', label: 'Merge' },
    { value: 'push', label: 'Push в main' },
  ];

  function ControlledMultiple() {
    const [value, setValue] = useState<string[]>(['pr', 'review']);
    return <Select multiple options={many} value={value} onValueChange={setValue} />;
  }

  it('renders chips for the selected values and the counter', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    expect(screen.getByText('Выбрано: 2 из 5')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'PR открыт' })).toBeChecked();
  });

  it('keeps the dropdown open and toggles via checkbox', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Merge' }));
    expect(screen.getByRole('checkbox', { name: 'Merge' })).toBeChecked();
    // дропдаун не закрывается — счётчик обновился до 3
    expect(screen.getByText('Выбрано: 3 из 5')).toBeInTheDocument();
  });

  it('removes a value via the chip cross', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Убрать' })[0]!);
    expect(screen.queryByText('PR открыт')).toBeNull();
  });

  it('toggles an option by clicking its label text exactly once', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    const listbox = screen.getByRole('listbox');
    // клик по тексту (лейблу чекбокса) внутри строки опции, а не по самому чекбоксу
    await userEvent.click(within(listbox).getByText('Merge'));
    expect(screen.getByRole('checkbox', { name: 'Merge' })).toBeChecked();
    expect(screen.getByText('Выбрано: 3 из 5')).toBeInTheDocument();
    // повторный клик по тексту снимает выбор (а не переключает дважды)
    await userEvent.click(within(listbox).getByText('Merge'));
    expect(screen.getByRole('checkbox', { name: 'Merge' })).not.toBeChecked();
    expect(screen.getByText('Выбрано: 2 из 5')).toBeInTheDocument();
  });

  it('toggles the dropdown with Enter and Space on the trigger', () => {
    render(<ControlledMultiple />);
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    // preventDefault у Space отменяет стандартное поведение браузера (fireEvent вернул бы true)
    expect(fireEvent.keyDown(trigger, { key: ' ' })).toBe(false);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not intercept keys from the chip remove button', async () => {
    render(<ControlledMultiple />);
    const remove = screen.getAllByRole('button', { name: 'Убрать' })[0]!;
    remove.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not toggle with keyboard when disabled', async () => {
    render(<Select multiple disabled options={many} value={['pr']} onValueChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    expect(trigger).toHaveAttribute('tabIndex', '-1');
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps chips on one line with ellipsis by default, wraps when chipsWrap is on', () => {
    const { rerender } = render(
      <Select multiple options={many} value={['pr', 'review']} onValueChange={vi.fn()} />,
    );
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    const chipsBox = trigger.querySelector('.flex-1');
    expect(trigger.className).toContain('overflow-hidden');
    expect(chipsBox?.className).toContain('overflow-hidden');
    expect(chipsBox?.className).not.toContain('flex-wrap');

    rerender(
      <Select multiple chipsWrap options={many} value={['pr', 'review']} onValueChange={vi.fn()} />,
    );
    expect(trigger.className).toContain('min-h-10');
    expect(chipsBox?.className).toContain('flex-wrap');
    expect(chipsBox?.className).not.toContain('overflow-hidden');
  });
});
