import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('lets a later elevation shadow replace a default one', () => {
    expect(cn('shadow-sm', 'shadow-elevation-1')).toBe('shadow-elevation-1');
  });

  it('keeps an elevation shadow next to a shadow color', () => {
    expect(cn('shadow-elevation-2', 'shadow-black')).toBe('shadow-elevation-2 shadow-black');
  });
});
