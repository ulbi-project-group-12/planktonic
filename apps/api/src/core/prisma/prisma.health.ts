import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from './prisma.service.js';

/** Identifier-shaped values only, so a classification never carries a host, user or message. */
const IDENTIFIER = /^[\w.-]{1,64}$/;

/** `value[key]` when `value` is an object, otherwise undefined. */
function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * A value-free classification of a readiness failure for the server log, e.g.
 * `P2010 AuthenticationFailed 28P01` or `P2010 DatabaseNotReachable`: the Prisma or Node error
 * code, then the driver adapter's error kind and the Postgres SQLSTATE when present. Anything that
 * is not identifier-shaped is dropped, so the driver's message, host, port and user never reach it.
 */
export function classifyDatabaseError(error: unknown): string {
  const cause = field(field(field(error, 'meta'), 'driverAdapterError'), 'cause');
  const parts = [
    field(error, 'code') ?? field(error, 'name'),
    field(cause, 'kind'),
    field(cause, 'originalCode'),
  ];
  const safe = parts.filter(
    (part): part is string => typeof part === 'string' && IDENTIFIER.test(part),
  );
  return safe.length > 0 ? safe.join(' ') : 'unknown';
}

/**
 * Upper bound for the whole probe. The pool's connect timeout (prisma.service.ts) does not cover a
 * database that accepts the connection and then never answers, so the probe races a timer.
 */
export const READINESS_TIMEOUT_MS = 5000;

/**
 * Server-side bound for the probe query, below READINESS_TIMEOUT_MS: Postgres cancels `SELECT 1`
 * itself, so a slow database frees the pooled connection instead of holding it after the HTTP
 * check has already answered 503. Transaction-local, so product queries keep no limit.
 */
export const PROBE_STATEMENT_TIMEOUT_MS = 4000;

/** Rejects with a `ReadinessTimeout` error when `promise` has not settled within `ms`. */
async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        Object.assign(new Error(`no answer within ${String(ms)} ms`), { name: 'ReadinessTimeout' }),
      );
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Database readiness for terminus: `SELECT 1` through Prisma, bounded by READINESS_TIMEOUT_MS on
 * the client and PROBE_STATEMENT_TIMEOUT_MS on the server.
 */
@Injectable()
export class PrismaHealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);

  /**
   * The probe currently running, shared by concurrent checks. However often /api/health/ready is
   * hit, and even when a probe outlives its timeout, at most one probe holds a pooled connection.
   */
  private inFlight: Promise<unknown> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy<const Key extends string>(key: Key) {
    const session = this.indicator.check(key);
    try {
      await withTimeout(this.probe(), READINESS_TIMEOUT_MS);
      return session.up();
    } catch (error) {
      // The cause goes to the server log as a value-free classification; the HTTP body keeps a
      // fixed message, because the driver's error text can carry the host, port or user.
      this.logger.warn(`database readiness failed: ${classifyDatabaseError(error)}`);
      return session.down({ message: 'database unreachable' });
    }
  }

  /** `SELECT 1` in a transaction with its own statement_timeout; concurrent checks share it. */
  private probe(): Promise<unknown> {
    this.inFlight ??= this.prisma
      .$transaction([
        // set_config(..., true) is SET LOCAL with a bind parameter (SET itself takes none).
        this.prisma
          .$queryRaw`SELECT set_config('statement_timeout', ${String(PROBE_STATEMENT_TIMEOUT_MS)}, true)`,
        this.prisma.$queryRaw`SELECT 1`,
      ])
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }
}
