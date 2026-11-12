import { Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyDatabaseError,
  PrismaHealthIndicator,
  PROBE_STATEMENT_TIMEOUT_MS,
  READINESS_TIMEOUT_MS,
} from './prisma.health.js';
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

/** A PrismaService stand-in whose raw queries all return `query()`; batch $transaction runs them. */
function fakePrisma(query: () => Promise<unknown>) {
  const $transaction = vi.fn((operations: Promise<unknown>[]) => Promise.all(operations));
  const $queryRaw = vi.fn<(...template: unknown[]) => Promise<unknown>>(() => query());
  return {
    prisma: { $queryRaw, $transaction } as unknown as PrismaService,
    $queryRaw,
    $transaction,
  };
}

function indicatorFailingWith(error: Error) {
  const { prisma } = fakePrisma(() => Promise.reject(error));
  return new PrismaHealthIndicator(prisma, new HealthIndicatorService());
}

afterEach(() => {
  vi.useRealTimers();
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
    const { prisma, $queryRaw } = fakePrisma(() => Promise.resolve([{ '?column?': 1 }]));
    const indicator = new PrismaHealthIndicator(prisma, new HealthIndicatorService());
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    });
    // statement_timeout is set inside the same transaction, as a bind parameter.
    const [setConfig] = $queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, string];
    expect(setConfig.join('?')).toContain("set_config('statement_timeout', ?, true)");
    expect($queryRaw.mock.calls[0]?.[1]).toBe(String(PROBE_STATEMENT_TIMEOUT_MS));
    expect(PROBE_STATEMENT_TIMEOUT_MS).toBeLessThan(READINESS_TIMEOUT_MS);
  });

  it('shares one in-flight probe between concurrent checks, then probes afresh', async () => {
    let answer: (rows: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => {
      answer = resolve;
    });
    const { prisma, $transaction } = fakePrisma(() => pending);
    const indicator = new PrismaHealthIndicator(prisma, new HealthIndicatorService());
    const first = indicator.isHealthy('database');
    const second = indicator.isHealthy('database');
    expect($transaction).toHaveBeenCalledOnce();
    answer([{ '?column?': 1 }]);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { database: { status: 'up' } },
      { database: { status: 'up' } },
    ]);
    await indicator.isHealthy('database');
    expect($transaction).toHaveBeenCalledTimes(2);
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

  it('fails readiness when the database connects but never answers', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { prisma } = fakePrisma(() => new Promise<never>(() => undefined));
    const indicator = new PrismaHealthIndicator(prisma, new HealthIndicatorService());
    const result = indicator.isHealthy('database');
    await vi.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);
    await expect(result).resolves.toEqual({
      database: { status: 'down', message: 'database unreachable' },
    });
    expect(warn).toHaveBeenCalledExactlyOnceWith('database readiness failed: ReadinessTimeout');
  });
});
