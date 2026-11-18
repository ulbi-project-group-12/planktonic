import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select, fitChipCount, type SelectOption } from './select';

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
    // focus on open goes to the first option
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

  it('moves from the search input to the options with ArrowDown and back with ArrowUp', async () => {
    render(<Select options={options} value={[]} onValueChange={vi.fn()} searchable />);
    await userEvent.click(screen.getByRole('button'));
    const search = screen.getByLabelText('Поиск по списку');
    expect(search).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Все участники' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(search).toHaveFocus();
  });

  it('focuses the selected option from the search input', async () => {
    render(<Select options={options} value={['only-owner']} onValueChange={vi.fn()} searchable />);
    await userEvent.click(screen.getByRole('button', { name: /Только владельцы/ }));
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Только владельцы' })).toHaveFocus();
  });

  it('focuses the selected option in the filtered list, not at its index in the full list', async () => {
    render(<Select options={options} value={['owner']} onValueChange={vi.fn()} searchable />);
    await userEvent.click(screen.getByRole('button', { name: /Владелец и админы/ }));
    // 'владел' leaves 'Владелец и админы' (index 0) and 'Только владельцы' (index 1) in the listbox;
    // the selected option is at index 0 of `filtered` but index 1 of `options`
    await userEvent.type(screen.getByLabelText('Поиск по списку'), 'владел');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Владелец и админы' })).toHaveFocus();
  });
});

describe('fitChipCount (ellipsis math)', () => {
  it('reserves the ellipsis width only when a chip gets hidden', () => {
    // two 80 px chips + 12 px ellipsis + gap fit into 190 px, three do not
    expect(fitChipCount([80, 80, 80], 190, 12, 6)).toBe(2);
    // everything fits — no ellipsis, no reserve
    expect(fitChipCount([80, 80], 190, 12, 6)).toBe(2);
    // two 90 px chips (186) still fit without an ellipsis — no reserve applied
    expect(fitChipCount([90, 90], 190, 12, 6)).toBe(2);
    // three 90 px chips do not fit; with the ellipsis reserved only one stays
    expect(fitChipCount([90, 90, 90], 190, 12, 6)).toBe(1);
    // nothing fits at all — only the ellipsis stays
    expect(fitChipCount([80, 80], 40, 12, 6)).toBe(0);
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
    expect(screen.getByRole('option', { name: 'PR открыт' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('keeps the dropdown open and toggles an option on click', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Merge' }));
    expect(screen.getByRole('option', { name: 'Merge' })).toHaveAttribute('aria-selected', 'true');
    // the dropdown stays open — the counter updated to 3
    expect(screen.getByText('Выбрано: 3 из 5')).toBeInTheDocument();
  });

  it('keeps the option row focused after a pointer click on its check box', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    const merge = screen.getByRole('option', { name: 'Merge' });
    await userEvent.click(merge.querySelector<HTMLElement>('[data-slot="select-option-check"]')!);
    // the row stays the keyboard target for arrows/Enter
    expect(screen.getByRole('option', { name: 'Merge' })).toHaveFocus();
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
    // click on the text inside the option row
    await userEvent.click(within(listbox).getByText('Merge'));
    expect(screen.getByRole('option', { name: 'Merge' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Выбрано: 3 из 5')).toBeInTheDocument();
    // a second click on the text removes the selection (instead of toggling twice)
    await userEvent.click(within(listbox).getByText('Merge'));
    expect(screen.getByRole('option', { name: 'Merge' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Выбрано: 2 из 5')).toBeInTheDocument();
  });

  it('opens with Enter on the trigger, moves focus into the list and closes with Escape', async () => {
    render(<ControlledMultiple />);
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // focus moves to the first selected option on open
    expect(screen.getByRole('option', { name: 'PR открыт' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('navigates the list and toggles options with the keyboard', async () => {
    render(<ControlledMultiple />);
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    // focus starts on the first selected option
    expect(screen.getByRole('option', { name: 'PR открыт' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Запрос ревью' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('option', { name: 'Push в main' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    // toggled on, the dropdown stays open — the counter updated to 3
    expect(screen.getByText('Выбрано: 3 из 5')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Space}');
    // toggled off again
    expect(screen.getByText('Выбрано: 2 из 5')).toBeInTheDocument();
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

  it('renders no chip remove buttons when disabled', () => {
    render(
      <Select multiple disabled options={many} value={['pr', 'review']} onValueChange={vi.fn()} />,
    );
    // the wrapper dims and ignores the mouse, but the cross would stay keyboard-reachable —
    // so disabled must drop onRemove entirely (the Chip then renders no button at all)
    expect(screen.queryAllByRole('button', { name: 'Убрать' })).toHaveLength(0);
    expect(screen.getByText('PR открыт')).toBeInTheDocument();
  });

  it('keeps chips on one line with ellipsis by default, wraps when chipsWrap is on', () => {
    const { rerender } = render(
      <Select multiple options={many} value={['pr', 'review']} onValueChange={vi.fn()} />,
    );
    const trigger = screen.getByRole('button', { name: /PR открыт/ });
    const field = trigger.parentElement;
    const chipsBox = field?.querySelector('[data-slot="select-chips"]');
    expect(field?.className).toContain('overflow-hidden');
    expect(chipsBox?.className).toContain('overflow-hidden');
    expect(chipsBox?.className).not.toContain('flex-wrap');

    rerender(
      <Select multiple chipsWrap options={many} value={['pr', 'review']} onValueChange={vi.fn()} />,
    );
    expect(field?.className).toContain('min-h-10');
    expect(chipsBox?.className).toContain('flex-wrap');
    expect(chipsBox?.className).not.toContain('overflow-hidden');
  });

  it('exposes id, name and aria-label for form usage', () => {
    render(
      <Select
        id="role"
        name="role"
        aria-label="Роль"
        options={many}
        value={['pr', 'review']}
        onValueChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Роль' });
    expect(trigger).toHaveAttribute('id', 'role');
    const hidden = document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="role"]');
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toHaveValue('pr');
    expect(hidden[1]).toHaveValue('review');
  });

  it('names the open dropdown after its trigger', async () => {
    render(<ControlledMultiple />);
    await userEvent.click(screen.getByRole('button', { name: /PR открыт/ }));
    expect(screen.getByRole('listbox', { name: /PR открыт/ })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /PR открыт/ })).toBeInTheDocument();
  });
});
