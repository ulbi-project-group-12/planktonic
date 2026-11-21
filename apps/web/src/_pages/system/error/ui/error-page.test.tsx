import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorPage } from './error-page';

describe('ErrorPage', () => {
  it('calls reset on retry', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('shows the digest but never the raw error message', () => {
    render(
      <ErrorPage
        error={Object.assign(new Error('secret internals'), { digest: 'abc' })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Код ошибки: abc/)).toBeInTheDocument();
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();
  });
});
