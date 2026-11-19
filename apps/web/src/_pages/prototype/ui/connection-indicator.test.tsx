import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConnectionState } from '@/shared/api';
import { ConnectionIndicator } from './connection-indicator';

const store = vi.hoisted((): { state: ConnectionState } => ({ state: 'connecting' }));

vi.mock('@/shared/api', () => ({
  useConnectionStore: <T,>(selector: (s: { state: ConnectionState }) => T): T =>
    selector({ state: store.state }),
}));

describe('ConnectionIndicator', () => {
  it.each([
    ['connecting', 'warning'],
    ['connected', 'success'],
    ['syncing', 'info'],
    ['offline', 'danger'],
  ] as const)('shows %s as text with a %s dot', (state, variant) => {
    store.state = state;
    render(<ConnectionIndicator />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`Connection: ${state}`);
    expect(status.querySelector('[data-slot="badge"]')).toHaveAttribute('data-variant', variant);
  });
});
