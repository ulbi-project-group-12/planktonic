import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Link } from './link';

describe('Link', () => {
  it('renders an inline link with brand class', () => {
    render(<Link href="/guide">Регламент</Link>);
    const link = screen.getByRole('link', { name: 'Регламент' });
    expect(link).toHaveAttribute('data-variant', 'inline');
    expect(link).toHaveClass('text-brand-primary');
  });

  it('renders an external link with the ↗ icon', () => {
    render(
      <Link variant="external" href="https://github.com/planktonic">
        github.com/planktonic
      </Link>,
    );
    const link = screen.getByRole('link', { name: /github\.com\/planktonic/ });
    expect(link).toHaveAttribute('data-variant', 'external');
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('marks an active nav link with the subtle background', () => {
    render(
      <Link variant="nav" active href="/design">
        # дизайн
      </Link>,
    );
    expect(screen.getByRole('link', { name: '# дизайн' })).toHaveClass('bg-brand-subtle');
  });

  it('disables the link', () => {
    render(
      <Link disabled href="#">
        документация
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'документация' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('navigates on click', async () => {
    const onClick = vi.fn();
    render(
      <Link href="#" onClick={onClick}>
        PR #128
      </Link>,
    );
    await userEvent.click(screen.getByRole('link', { name: /PR #128/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
