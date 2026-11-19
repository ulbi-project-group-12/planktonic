import { ClientMsgId } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { uuidv7 } from './uuidv7';

/** The 48-bit millisecond timestamp in the first 12 hex digits. */
function timestampOf(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}

describe('uuidv7', () => {
  it('makes lowercase, unique ids the contracts accept as a clientMsgId', () => {
    const ids = Array.from({ length: 1000 }, () => uuidv7());
    for (const id of ids) {
      expect(ClientMsgId.safeParse(id).success).toBe(true);
      expect(id).toBe(id.toLowerCase());
    }
    expect(new Set(ids).size).toBe(1000);
  });

  it('sets version 7 and the RFC 9562 variant', () => {
    for (let i = 0; i < 100; i += 1) {
      const id = uuidv7();
      expect(id[14]).toBe('7');
      expect(['8', '9', 'a', 'b']).toContain(id[19]);
    }
  });

  it('writes the timestamp big-endian into the first 48 bits', () => {
    expect(uuidv7(0x0123456789ab).startsWith('01234567-89ab-7')).toBe(true);
    expect(uuidv7(0).startsWith('00000000-0000-7')).toBe(true);
    expect(uuidv7(2 ** 48 - 1).startsWith('ffffffff-ffff-7')).toBe(true);
  });

  it('has a non-decreasing timestamp prefix taken from Date.now()', () => {
    const before = Date.now();
    const stamps = Array.from({ length: 200 }, () => timestampOf(uuidv7()));
    const after = Date.now();
    for (let i = 1; i < stamps.length; i += 1) {
      expect(stamps[i]).toBeGreaterThanOrEqual(stamps[i - 1] ?? 0);
    }
    expect(stamps[0]).toBeGreaterThanOrEqual(before);
    expect(stamps.at(-1)).toBeLessThanOrEqual(after);
  });

  it('rejects a timestamp outside the 48-bit millisecond range', () => {
    expect(() => uuidv7(-1)).toThrow(RangeError);
    expect(() => uuidv7(2 ** 48)).toThrow(RangeError);
    expect(() => uuidv7(1.5)).toThrow(RangeError);
  });
});
