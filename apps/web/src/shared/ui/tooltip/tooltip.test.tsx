import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip, TooltipProvider } from './tooltip';

describe('Tooltip', () => {
  it('renders content when open', () => {
    render(
      <TooltipProvider>
        <Tooltip open content="Создать задачу">
          <button type="button">Наведи</button>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText('Создать задачу')).toBeInTheDocument();
  });

  it('hides content when closed', () => {
    render(
      <TooltipProvider>
        <Tooltip open={false} content="Создать задачу">
          <button type="button">Наведи</button>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByText('Создать задачу')).toBeNull();
  });

  it('renders rich content and side', () => {
    render(
      <TooltipProvider>
        <Tooltip
          open
          side="right"
          content={
            <span>
              Сохранить в избранное — <b>Сообщение попадёт в личный список</b>
            </span>
          }
        >
          <button type="button">Наведи</button>
        </Tooltip>
      </TooltipProvider>,
    );
    const tooltip = screen.getByText('Сохранить в избранное —').closest('[data-slot="tooltip"]');
    expect(tooltip).toHaveAttribute('data-side', 'right');
    expect(screen.getByText('Сообщение попадёт в личный список')).toBeInTheDocument();
  });

  it('reports open change', () => {
    const onOpenChange = vi.fn();
    render(
      <TooltipProvider>
        <Tooltip open={false} onOpenChange={onOpenChange} content="Создать задачу">
          <button type="button">Наведи</button>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
