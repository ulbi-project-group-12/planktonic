import { createHash, randomUUID } from 'node:crypto';
import type { RedisClientType } from 'redis';

const WINDOW_MS = 15 * 60_000;
const ACCOUNT_THRESHOLD = 5;
const IP_THRESHOLD = 20;
const BASE_COOLDOWN_MS = 1_000;
const MAX_COOLDOWN_MS = 60_000;
const RESERVATION_MS = 30_000;

const REDIS_NOW = `
  local time = redis.call('TIME')
  local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
`;

// Reserve capacity in both dimensions before starting expensive password verification.
const BEGIN_ATTEMPT = `
  ${REDIS_NOW}
  local function waitFor(offset, threshold)
    local failures = tonumber(redis.call('GET', KEYS[offset]) or '0')
    local pending = KEYS[offset + 2]
    redis.call('ZREMRANGEBYSCORE', pending, '-inf', now)
    local retry = redis.call('PTTL', KEYS[offset + 1])
    if redis.call('ZCARD', pending) >= math.max(1, threshold - failures) then
      retry = math.max(retry, tonumber(ARGV[5]))
    end
    return retry
  end

  local retry = math.max(waitFor(1, tonumber(ARGV[3])), waitFor(4, tonumber(ARGV[4])))
  if retry > 0 then return retry end

  for _, pending in ipairs({KEYS[3], KEYS[6]}) do
    redis.call('ZADD', pending, now + tonumber(ARGV[2]), ARGV[1])
    redis.call('PEXPIRE', pending, ARGV[2])
  end
  return 0
`;

const FINISH_ATTEMPT = `
  ${REDIS_NOW}
  local function release(pending)
    local expires = tonumber(redis.call('ZSCORE', pending, ARGV[1]) or '0')
    redis.call('ZREM', pending, ARGV[1])
    return expires > now
  end

  local accountValid = release(KEYS[3])
  local ipValid = release(KEYS[6])
  if not accountValid or not ipValid then return 0 end

  local function record(counter, cooldown, threshold)
    local count = redis.call('INCR', counter)
    if count == 1 then redis.call('PEXPIRE', counter, ARGV[3]) end
    if count < threshold then return end

    local exponent = math.min(count - threshold, 16)
    local delay = math.min(tonumber(ARGV[5]), tonumber(ARGV[4]) * 2 ^ exponent)
    if redis.call('PTTL', cooldown) < delay then
      redis.call('SET', cooldown, '1', 'PX', delay)
    end
  end

  if ARGV[2] == 'failure' then
    record(KEYS[1], KEYS[2], tonumber(ARGV[6]))
    record(KEYS[4], KEYS[5], tonumber(ARGV[7]))
  elseif ARGV[2] == 'success' then
    -- One successful login must not erase IP history or other requests' reservations.
    redis.call('DEL', KEYS[1], KEYS[2])
  end
  return 1
`;

function keys(dimension: 'account' | 'ip', value: string): string[] {
  const digest = createHash('sha256').update(value).digest('hex');
  const key = `auth:login:${dimension}:${digest}`;
  return [`${key}:failures`, `${key}:cooldown`, `${key}:pending`];
}

function attemptKeys(email: string, ip: string): string[] {
  return [...keys('account', email.trim().toLowerCase()), ...keys('ip', ip)];
}

type Admission = { id: string } | { retryAfterMs: number };
export type AttemptOutcome = 'success' | 'failure' | 'cancelled';

export class LoginAttemptsStore {
  constructor(private readonly redis: Pick<RedisClientType, 'eval'>) {}

  async begin(email: string, ip: string): Promise<Admission> {
    const id = randomUUID();
    const retry = await this.redis.eval(BEGIN_ATTEMPT, {
      keys: attemptKeys(email, ip),
      arguments: [
        id,
        String(RESERVATION_MS),
        String(ACCOUNT_THRESHOLD),
        String(IP_THRESHOLD),
        String(BASE_COOLDOWN_MS),
      ],
    });
    if (typeof retry !== 'number' || retry < 0) throw new Error('Invalid login admission result');
    return retry === 0 ? { id } : { retryAfterMs: retry };
  }

  async finish(email: string, ip: string, id: string, outcome: AttemptOutcome): Promise<void> {
    const finished = await this.redis.eval(FINISH_ATTEMPT, {
      keys: attemptKeys(email, ip),
      arguments: [
        id,
        outcome,
        String(WINDOW_MS),
        String(BASE_COOLDOWN_MS),
        String(MAX_COOLDOWN_MS),
        String(ACCOUNT_THRESHOLD),
        String(IP_THRESHOLD),
      ],
    });
    if (finished !== 1) throw new Error('Login attempt reservation expired');
  }
}
