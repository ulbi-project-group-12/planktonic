import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

/** The message validateEnv throws for `raw`; fails the test if it does not throw. */
function errorOf(raw: Record<string, unknown>): string {
  try {
    validateEnv(raw);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected validateEnv to throw');
}

describe('validateEnv', () => {
  it('defaults NODE_ENV to development and API_PORT to 3001', () => {
    expect(validateEnv({})).toEqual({ NODE_ENV: 'development', API_PORT: 3001 });
  });

  it('treats empty values as unset, as .env.example documents', () => {
    expect(validateEnv({ NODE_ENV: '', API_PORT: '' })).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3001,
    });
  });

  it('coerces API_PORT to a number', () => {
    expect(validateEnv({ API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it.each(['abc', '0', '70000'])(
    'rejects API_PORT %s, naming the variable but not the value',
    (value) => {
      const message = errorOf({ API_PORT: value });
      expect(message).toContain('API_PORT');
      expect(message).not.toContain(value);
    },
  );

  it('rejects an unknown NODE_ENV, naming the variable but not the value', () => {
    const message = errorOf({ NODE_ENV: 'staging' });
    expect(message).toContain('NODE_ENV');
    expect(message).not.toContain('staging');
  });
});
