import { describe, expect, it } from 'vitest';
import { TicketKey } from './index.js';

describe('TicketKey', () => {
  it.each(['UL-1', 'UL-42', 'UL-1000'])('accepts %s', (value) => {
    expect(TicketKey.safeParse(value).success).toBe(true);
  });

  it.each(['UL-0', 'ul-1', 'UL-', 'UL-01', 'PR-1', ' UL-1', 'UL-1a', ''])('rejects %j', (value) => {
    expect(TicketKey.safeParse(value).success).toBe(false);
  });

  it('reports a readable issue message for an invalid key', () => {
    const result = TicketKey.safeParse('UL-01');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Expected a ticket key like UL-12');
  });

  it('brands the type: a plain string is not a TicketKey at compile time', () => {
    // @ts-expect-error -- a plain string literal must not be assignable to the branded TicketKey
    const unbranded: TicketKey = 'UL-1';
    const parsed: TicketKey = TicketKey.parse('UL-1');
    expect(unbranded).toBe('UL-1');
    expect(parsed).toBe('UL-1');
  });
});
