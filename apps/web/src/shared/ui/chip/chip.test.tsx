import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './chip';

describe('Chip', () => {
  it('renders a subtle chip with palette classes', () => {
    render(<Chip palette="success">Готово</Chip>);
    const chip = screen.getByText('Готово');
    expect(chip).toHaveAttribute('data-slot', 'chip');
    expect(chip).toHaveAttribute('data-fill', 'subtle');
    expect(chip).toHaveClass('bg-success-subtle', 'text-success');
  });

  it('renders a neutral chip on sunken background', () => {
    render(<Chip fill="neutral">Нужно сделать</Chip>);
    expect(screen.getByText('Нужно сделать')).toHaveClass('bg-sunken', 'text-fg-secondary');
  });

  it('renders a solid chip with on-brand text', () => {
    render(
      <Chip fill="solid" palette="danger">
        Критичный
      </Chip>,
    );
    expect(screen.getByText('Критичный')).toHaveClass('bg-danger', 'text-on-brand');
  });

  it('renders a dot for the subtle fill', () => {
    render(
      <Chip dot palette="warning">
        Средний
      </Chip>,
    );
    expect(screen.getByText('Средний').querySelector('[data-slot="chip-dot"]')).not.toBeNull();
  });

  it('removes the chip via the cross button', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>PR открыт</Chip>);
    await userEvent.click(screen.getByRole('button', { name: 'Убрать' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
