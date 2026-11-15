import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoadMore, Pagination, PaginationStatus } from './pagination';

describe('Pagination', () => {
  it('renders numbers with an ellipsis between the edges', () => {
    render(<Pagination page={1} totalPages={12} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Страница 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Страница 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Страница 12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Страница 5' })).toBeNull();
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('navigates to a clicked page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={12} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Страница 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables the back arrow on the first page', () => {
    render(<Pagination page={1} totalPages={12} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Вперёд' })).toBeEnabled();
  });

  it('renders the compact variant', () => {
    render(<Pagination page={3} totalPages={12} onPageChange={vi.fn()} variant="compact" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('/ 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeEnabled();
  });
});

describe('LoadMore', () => {
  it('fires onLoadMore', async () => {
    const onLoadMore = vi.fn();
    render(<LoadMore onLoadMore={onLoadMore} batchSize={20} />);
    await userEvent.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText('подгрузит 20 сообщений')).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} loading />);
    const button = screen.getByRole('button', { name: /Загружаем/ });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });
});

describe('PaginationStatus', () => {
  it('shows the shown-of-total caption', () => {
    render(<PaginationStatus shown={20} total={134} />);
    expect(screen.getByText('Показано 20 из 134')).toBeInTheDocument();
  });
});
