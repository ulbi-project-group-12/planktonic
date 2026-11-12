import { Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyDatabaseError, PrismaHealthIndicator } from './prisma.health.js';
import type { PrismaService } from './prisma.service.js';

/** The shape Prisma 7 + @prisma/adapter-pg throws for a failed connect (observed, trimmed). */
function adapterError(cause: Record<string, unknown>) {
  return Object.assign(new Error('Raw query failed: postgresql://app:secret@db.internal:5432'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2010',
    meta: { driverAdapterError: { name: 'DriverAdapterError', cause } },
  });
}

const authFailed = adapterError({
  originalCode: '28P01',
  originalMessage: 'password authentication failed for user "app"',
  kind: 'AuthenticationFailed',
  user: 'app',
});

function indicatorFailingWith(error: Error) {
  const prisma = { $queryRaw: () => Promise.reject(error) } as unknown as PrismaService;
  return new PrismaHealthIndicator(prisma, new HealthIndicatorService());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classifyDatabaseError', () => {
  it('names the Prisma code, the adapter kind and the SQLSTATE', () => {
    expect(classifyDatabaseError(authFailed)).toBe('P2010 AuthenticationFailed 28P01');
  });

  it('names the kind when there is no SQLSTATE (connection refused)', () => {
    const refused = adapterError({ kind: 'DatabaseNotReachable', host: 'db.internal', port: 5432 });
    expect(classifyDatabaseError(refused)).toBe('P2010 DatabaseNotReachable');
  });

  it('falls back to a Node error code, then to the error name', () => {
    const refused = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), {
      code: 'ECONNREFUSED',
    });
    expect(classifyDatabaseError(refused)).toBe('ECONNREFUSED');
    expect(classifyDatabaseError(new TypeError('boom'))).toBe('TypeError');
  });

  it('drops anything that is not identifier-shaped, and never echoes a value', () => {
    const shaped = { code: 'host db.internal refused', meta: { driverAdapterError: {} } };
    expect(classifyDatabaseError(shaped)).toBe('unknown');
    expect(classifyDatabaseError('postgresql://app:secret@db.internal')).toBe('unknown');
    expect(classifyDatabaseError(undefined)).toBe('unknown');
  });
});

describe('PrismaHealthIndicator', () => {
  it('reports up when SELECT 1 succeeds', async () => {
    const prisma = { $queryRaw: () => Promise.resolve([{ '?column?': 1 }]) };
    const indicator = new PrismaHealthIndicator(
      prisma as unknown as PrismaService,
      new HealthIndicatorService(),
    );
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    });
  });

  it('logs a value-free cause and keeps the response message fixed', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await expect(indicatorFailingWith(authFailed).isHealthy('database')).resolves.toEqual({
      database: { status: 'down', message: 'database unreachable' },
    });
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'database readiness failed: P2010 AuthenticationFailed 28P01',
    );
    const logged = String(warn.mock.calls[0]?.[0]);
    for (const secret of ['secret', 'db.internal', '5432', 'password', '"app"']) {
      expect(logged).not.toContain(secret);
    }
  });
});
