import { setTimeout } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { LoginAttemptsStore } from '../../src/modules/auth/login/login-attempts.store.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: [], realtime: false });

async function withTwoStores(
  run: (first: LoginAttemptsStore, second: LoginAttemptsStore) => Promise<void>,
): Promise<void> {
  const secondClient = await stand.redis.duplicate().connect();
  try {
    await run(new LoginAttemptsStore(stand.redis), new LoginAttemptsStore(secondClient));
  } finally {
    await secondClient.close();
  }
}

async function recordFailure(store: LoginAttemptsStore, email: string, ip: string) {
  const admission = await store.begin(email, ip);
  if (!('id' in admission)) throw new Error('Expected an available login slot');
  await store.finish(email, ip, admission.id, 'failure');
}

it('reserves account slots across connections and increases the cooldown', async () => {
  await withTwoStores(async (first, second) => {
    const email = 'member@example.com';
    const firstIp = '192.0.2.1';
    const secondIp = '192.0.2.2';
    for (let index = 0; index < 4; index++) {
      await recordFailure(first, 'Member@Example.com', firstIp);
    }

    const lastSlot = await second.begin(email, secondIp);
    if (!('id' in lastSlot)) throw new Error('Expected the last login slot');
    expect(await first.begin(email, firstIp)).toEqual({ retryAfterMs: 1000 });

    await second.finish(email, secondIp, lastSlot.id, 'failure');
    expect(await first.begin(email, firstIp)).toHaveProperty('retryAfterMs');

    await setTimeout(1050);
    await recordFailure(first, email, firstIp);
    const limited = await second.begin(email, secondIp);
    if (!('retryAfterMs' in limited)) throw new Error('Expected an extended cooldown');
    expect(limited.retryAfterMs).toBeGreaterThan(1000);
  });
});

it('reserves IP slots across accounts and releases a cancelled attempt', async () => {
  await withTwoStores(async (first, second) => {
    const ip = '192.0.2.1';
    for (let index = 0; index < 19; index++) {
      await recordFailure(first, `member-${String(index)}@example.com`, ip);
    }

    const email = 'other@example.com';
    const lastSlot = await second.begin(email, ip);
    if (!('id' in lastSlot)) throw new Error('Expected the last login slot');
    expect(await first.begin('another@example.com', ip)).toEqual({ retryAfterMs: 1000 });
    await second.finish(email, ip, lastSlot.id, 'cancelled');

    const next = await first.begin(email, ip);
    if (!('id' in next)) throw new Error('Expected the cancelled slot to be available');
    await first.finish(email, ip, next.id, 'success');
    await recordFailure(second, email, ip);
    expect(await first.begin('another@example.com', ip)).toHaveProperty('retryAfterMs');
    const otherIp = '192.0.2.2';
    const allowed = await first.begin(email, otherIp);
    if (!('id' in allowed)) throw new Error('Expected an available slot on a different IP');
    await first.finish(email, otherIp, allowed.id, 'cancelled');
  });
});
