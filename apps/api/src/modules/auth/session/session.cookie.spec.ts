import { describe, expect, it } from 'vitest';
import { parseRefreshCookie } from './session.cookie.js';

describe('parseRefreshCookie', () => {
  it('decodes a valid cookie value', () => {
    expect(parseRefreshCookie('refresh_token=hello%2Eworld')).toBe('hello.world');
  });

  it('treats a malformed encoded value as missing', () => {
    expect(parseRefreshCookie('refresh_token=%E0%A4%A')).toBeUndefined();
  });
});
