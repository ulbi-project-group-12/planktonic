import { describe, expect, it } from 'vitest';
import { formatLastActiveAt, formatSignedInAt } from './session-time';

const now = new Date('2026-11-24T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe('formatLastActiveAt', () => {
  it('says "только что" inside the first minute', () => {
    expect(formatLastActiveAt(ago(30_000), now)).toBe('только что');
    expect(formatLastActiveAt(now.toISOString(), now)).toBe('только что');
  });

  it('pluralizes minutes the Russian way', () => {
    expect(formatLastActiveAt(ago(60_000), now)).toBe('1 минуту назад');
    expect(formatLastActiveAt(ago(3 * 60_000), now)).toBe('3 минуты назад');
    expect(formatLastActiveAt(ago(5 * 60_000), now)).toBe('5 минут назад');
    expect(formatLastActiveAt(ago(21 * 60_000), now)).toBe('21 минуту назад');
  });

  it('pluralizes hours under a day', () => {
    expect(formatLastActiveAt(ago(60 * 60_000), now)).toBe('1 час назад');
    expect(formatLastActiveAt(ago(3 * 60 * 60_000), now)).toBe('3 часа назад');
    expect(formatLastActiveAt(ago(12 * 60 * 60_000), now)).toBe('12 часов назад');
  });

  it('falls back to an absolute timestamp from a day up', () => {
    expect(formatLastActiveAt(ago(25 * 60 * 60_000), now, 'UTC')).toBe('23 ноября в 11:00');
  });
});

describe('formatSignedInAt', () => {
  it('shows date and time without the year of the current year', () => {
    expect(formatSignedInAt('2026-11-10T09:30:00Z', now, 'UTC')).toBe('10 ноября в 09:30');
  });

  it('adds the year for a session from another year', () => {
    expect(formatSignedInAt('2025-05-01T09:30:00Z', now, 'UTC')).toBe('1 мая 2025 г. в 09:30');
  });
});
