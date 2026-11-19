// UL-132: the stand's own guarantees — explicit instance ids, shared stores, the reset between
// tests, its safety guards, and waitForEvent errors that say what was missing.
import { describe, expect, it } from 'vitest';
import { INSTANCE_ID } from '../../src/core/instance/instance-id.provider.js';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway.js';
import { DEBUG_EVENT, RealtimeService } from '../../src/modules/realtime/realtime.service.js';
import { recordEvents, waitForEvent } from './support/events.js';
import { createChannel } from './support/http.js';
import { assertTestDatabase, assertTestRedis } from './support/reset.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['stand-1', 'stand-2'] });

function sockets(): number {
  return stand.apps[0]!.get(RealtimeGateway).server.sockets.sockets.size;
}

describe('integration stand', () => {
  it('starts each app with its own explicit instanceId', () => {
    expect(stand.apps.map((app) => app.get<string>(INSTANCE_ID))).toEqual(['stand-1', 'stand-2']);
  });

  it('delivers between instances, so both apps share one Redis', async () => {
    const b = await stand.connect(stand.apps[1]!, 'B');
    const ping = waitForEvent(b, DEBUG_EVENT);
    stand.apps[0]!.get(RealtimeService).emitDebugPing();
    expect(await ping).toEqual({ instanceId: 'stand-1' });
  });

  it('leaves data from one test for the next (part 1: write)', async () => {
    await createChannel(stand.prisma);
    await stand.redis.set('stand:leftover', '1');
    expect(await stand.prisma.channel.count()).toBe(1);
  });

  it('resets data before each test (part 2: nothing left)', async () => {
    expect(await stand.prisma.channel.count()).toBe(0);
    expect(await stand.redis.get('stand:leftover')).toBeNull();
    // The placeholder author is seeded again, so REST sends work in every test.
    expect(await stand.prisma.user.count()).toBe(1);
  });

  it('closes clients a test opened once that test ends (part 1: open)', async () => {
    await stand.connect(stand.apps[0]!, 'short-lived');
    expect(sockets()).toBe(1);
  });

  it('closes clients a test opened once that test ends (part 2: gone)', async () => {
    // The server notices the disconnect a moment after the client sends it.
    await expect.poll(sockets, { timeout: 2_000 }).toBe(0);
  });

  it('waitForEvent names the event, the client and its instance on timeout', async () => {
    const b = await stand.connect(stand.apps[1]!, 'B');
    await expect(waitForEvent(b, 'never:sent', { timeoutMs: 50 })).rejects.toThrow(
      'Timed out after 50 ms waiting for "never:sent" on client "B" (instance stand-2)',
    );
  });

  it('waitForEvent fails at once when the client disconnects', async () => {
    const a = await stand.connect(stand.apps[0]!, 'A');
    const waiting = waitForEvent(a, 'never:sent', { timeoutMs: 5_000 });
    a.disconnect();
    await expect(waiting).rejects.toThrow(
      'client "A" (instance stand-1) disconnected (io client disconnect) while waiting for "never:sent"',
    );
  });

  it('waitForEvent fails at once for a client that is already disconnected', async () => {
    const a = await stand.connect(stand.apps[0]!, 'A');
    a.disconnect();
    await expect(waitForEvent(a, 'never:sent')).rejects.toThrow(
      'client "A" (instance stand-1) is not connected',
    );
  });

  it('an app started inside a test receives from another instance at once', async () => {
    // startApp waits for the new app's stream reader, so nothing emitted after it is lost.
    const late = await stand.startApp('stand-late');
    const c = await stand.connect(late, 'C');
    const ping = waitForEvent(c, DEBUG_EVENT);
    stand.apps[0]!.get(RealtimeService).emitDebugPing();
    expect(await ping).toEqual({ instanceId: 'stand-1' });
  });

  it('recordEvents rejects at once when a payload fails to parse', async () => {
    const a = await stand.connect(stand.apps[0]!, 'A');
    const recorder = recordEvents(a, DEBUG_EVENT, () => {
      throw new Error('bad payload');
    });
    const counting = recorder.waitForCount(1, 5_000);
    stand.apps[1]!.get(RealtimeService).emitDebugPing();
    await expect(counting).rejects.toThrow('Invalid payload of "debug:ping" on client "A"');
  });

  it('recordEvents reports how many events did arrive', async () => {
    const a = await stand.connect(stand.apps[0]!, 'A');
    const recorder = recordEvents(a, DEBUG_EVENT);
    const first = waitForEvent(a, DEBUG_EVENT);
    stand.apps[1]!.get(RealtimeService).emitDebugPing();
    await first;
    await expect(recorder.waitForCount(2, 50)).rejects.toThrow(
      'waiting for 2 "debug:ping" event(s) on client "A" (instance stand-1); got 1',
    );
  });

  it('is connected to the test stores the URLs name', async () => {
    const [{ name }] = await stand.prisma.$queryRaw<
      [{ name: string }]
    >`SELECT current_database() AS name`;
    expect(name).toMatch(/_test$/);
    expect((await stand.redis.clientInfo()).db).toBeGreaterThan(0);
  });

  it('refuses stores that are not plainly for tests', () => {
    expect(() => {
      assertTestDatabase('postgresql://app:secret@127.0.0.1:55432/app');
    }).toThrow(/refuses database "app"/);
    expect(() => {
      assertTestDatabase('postgresql://app:secret@127.0.0.1:55432/app');
    }).not.toThrow(/secret/);
    expect(() => {
      assertTestDatabase('postgresql://app:secret@127.0.0.1:55432/app_test');
    }).not.toThrow();
    expect(() => {
      assertTestRedis('redis://127.0.0.1:56379');
    }).toThrow(/refuses database 0/);
    expect(() => {
      assertTestRedis('redis://127.0.0.1:56379/0');
    }).toThrow(/refuses database "0"/);
    expect(() => {
      assertTestRedis('redis://127.0.0.1:56379/1');
    }).not.toThrow();
    // A NUL would end the name early in the Postgres startup packet.
    expect(() => {
      assertTestDatabase('postgresql://app@127.0.0.1/app%00application_name%00x_test');
    }).toThrow(/refuses database/);
    // A malformed URL is refused without echoing it (Node's URL error carries the input).
    expect(() => {
      assertTestDatabase('postgresql://app:secret@/app_test');
    }).toThrow('could not parse DATABASE_URL');
    expect(() => {
      assertTestRedis('unix:///5');
    }).toThrow('needs a redis:// or rediss:// REDIS_URL');
  });
});
