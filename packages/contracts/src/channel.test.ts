import { describe, expect, it } from 'vitest';
import { ChannelId } from './channel.js';

describe('ChannelId', () => {
  it('accepts a uuid', () => {
    expect(ChannelId.safeParse('0190f5a2-7c1e-7b3a-9f4d-2a6b8c1d0e5f').success).toBe(true);
  });

  it.each([
    ['number', '123'],
    ['empty', ''],
    ['not a uuid', 'general'],
  ])('rejects %s', (_, id) => {
    expect(ChannelId.safeParse(id).success).toBe(false);
  });
});
