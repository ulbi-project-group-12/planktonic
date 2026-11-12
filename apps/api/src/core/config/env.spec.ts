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

// DATABASE_URL is required; tests of the other variables start from a valid one.
const DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

describe('validateEnv', () => {
  it('defaults NODE_ENV to development and API_PORT to 3001', () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3001,
      DATABASE_URL,
    });
  });

  it('treats empty values as unset, as .env.example documents', () => {
    expect(validateEnv({ NODE_ENV: '', API_PORT: '', DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3001,
      DATABASE_URL,
    });
  });

  it('coerces API_PORT to a number', () => {
    expect(validateEnv({ API_PORT: '4000', DATABASE_URL }).API_PORT).toBe(4000);
  });

  it.each(['abc', '0', '70000'])(
    'rejects API_PORT %s, naming the variable but not the value',
    (value) => {
      const message = errorOf({ API_PORT: value, DATABASE_URL });
      expect(message).toContain('API_PORT');
      expect(message).not.toContain(value);
    },
  );

  it('rejects an unknown NODE_ENV, naming the variable but not the value', () => {
    const message = errorOf({ NODE_ENV: 'staging', DATABASE_URL });
    expect(message).toContain('NODE_ENV');
    expect(message).not.toContain('staging');
  });

  it('requires DATABASE_URL', () => {
    expect(errorOf({})).toContain('DATABASE_URL');
  });

  it('accepts a postgresql:// DATABASE_URL', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' }).DATABASE_URL).toBe(
      'postgresql://u:p@localhost:5432/db',
    );
  });

  it.each(['mysql://x', 'postgresql-but-not-a-url'])(
    'rejects DATABASE_URL %s, naming the variable but not the value',
    (value) => {
      const message = errorOf({ DATABASE_URL: value });
      expect(message).toContain('DATABASE_URL');
      expect(message).not.toContain(value);
    },
  );
});
