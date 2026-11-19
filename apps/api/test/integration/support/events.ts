// Waiting for Socket.IO events in integration specs: wait for the event itself, never a timer.
// Every timeout names the event, the client and its instance, so a red run says what was missing.
import type { Socket } from 'socket.io-client';

export const EVENT_TIMEOUT_MS = 5_000;

const descriptions = new WeakMap<Socket, string>();

/** Called by the stand when it connects a client: `client "B" (instance test-api-2)`. */
export function describeAs(client: Socket, label: string, instanceId: string): void {
  descriptions.set(client, `client "${label}" (instance ${instanceId})`);
}

export function describeClient(client: Socket): string {
  return descriptions.get(client) ?? `client ${client.id ?? '(not connected)'}`;
}

export interface WaitOptions<T> {
  timeoutMs?: number;
  /** Turns the raw payload into T; a throw rejects the wait with the parse error. */
  parse?: (payload: unknown) => T;
  /** Only a payload that matches resolves the wait; others are ignored. */
  match?: (payload: T) => boolean;
}

// Pending waits per client, so the stand can cancel them when it closes the client: a wait left
// behind by a failed test must not reject later, unhandled, in the middle of another test.
const pending = new WeakMap<Socket, Set<() => void>>();

function track(client: Socket, cancel: () => void): () => void {
  let set = pending.get(client);
  if (!set) {
    set = new Set();
    pending.set(client, set);
  }
  set.add(cancel);
  return () => set.delete(cancel);
}

/** Drops every pending wait on `client` without settling it. Called by the stand on teardown. */
export function cancelWaits(client: Socket): void {
  const set = pending.get(client);
  if (!set) return;
  for (const cancel of [...set]) cancel();
  pending.delete(client);
}

/**
 * Resolves with the first `event` payload on `client` (that passes `match`). Rejects on timeout or
 * when the client is or becomes disconnected. Start waiting before triggering the event.
 */
export function waitForEvent<T = unknown>(
  client: Socket,
  event: string,
  options: WaitOptions<T> = {},
): Promise<T> {
  const {
    timeoutMs = EVENT_TIMEOUT_MS,
    parse = (payload: unknown) => payload as T,
    match,
  } = options;
  const where = `"${event}" on ${describeClient(client)}`;

  if (!client.connected) {
    return Promise.reject(
      new Error(`${describeClient(client)} is not connected, so it cannot wait for ${where}`),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      client.off(event, onEvent);
      client.off('disconnect', onDisconnect);
      untrack();
    };
    const onEvent = (payload: unknown): void => {
      let value: T;
      try {
        value = parse(payload);
      } catch (error) {
        cleanup();
        reject(new Error(`Invalid payload of ${where}`, { cause: error }));
        return;
      }
      if (match && !match(value)) return;
      cleanup();
      resolve(value);
    };
    const onDisconnect = (reason: string): void => {
      cleanup();
      reject(
        new Error(`${describeClient(client)} disconnected (${reason}) while waiting for ${where}`),
      );
    };
    const untrack = track(client, cleanup);
    // cleanup() runs only from callbacks, after both consts below are initialised.
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${String(timeoutMs)} ms waiting for ${where}`));
    }, timeoutMs);

    client.on(event, onEvent);
    client.on('disconnect', onDisconnect);
  });
}

export interface EventRecorder<T> {
  /** Every payload received so far, in arrival order. */
  readonly events: readonly T[];
  /**
   * Resolves once at least `count` events have arrived; the error says how many did. Rejects at
   * once if a payload failed `parse`.
   */
  waitForCount(count: number, timeoutMs?: number): Promise<readonly T[]>;
  /** Stops recording; `events` keeps what arrived. */
  stop(): void;
}

/**
 * Records every `event` on `client` from now on. Use it where a test needs the full list, for
 * example to prove that a control event arrived and nothing else did.
 */
export function recordEvents<T = unknown>(
  client: Socket,
  event: string,
  parse: (payload: unknown) => T = (payload) => payload as T,
): EventRecorder<T> {
  const events: T[] = [];
  let parseError: Error | undefined;
  const waiters = new Set<() => void>();
  const listener = (payload: unknown): void => {
    try {
      events.push(parse(payload));
    } catch (error) {
      parseError ??= new Error(
        `Invalid payload of "${event}" on ${describeClient(client)} ` +
          `(event #${String(events.length + 1)})`,
        { cause: error },
      );
    }
    for (const notify of [...waiters]) notify();
  };
  client.on(event, listener);

  return {
    events,
    waitForCount(count, timeoutMs = EVENT_TIMEOUT_MS) {
      if (parseError) return Promise.reject(parseError);
      if (events.length >= count) return Promise.resolve(events);
      return new Promise((resolve, reject) => {
        const cleanup = (): void => {
          clearTimeout(timer);
          waiters.delete(notify);
          untrack();
        };
        const notify = (): void => {
          if (parseError) {
            cleanup();
            reject(parseError);
          } else if (events.length >= count) {
            cleanup();
            resolve(events);
          }
        };
        const untrack = track(client, cleanup);
        // cleanup() runs only from callbacks, after both consts below are initialised.
        const timer = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              `Timed out after ${String(timeoutMs)} ms waiting for ${String(count)} "${event}" ` +
                `event(s) on ${describeClient(client)}; got ${String(events.length)}`,
            ),
          );
        }, timeoutMs);
        waiters.add(notify);
      });
    },
    stop() {
      client.off(event, listener);
    },
  };
}

/**
 * One-shot wait for a client's own lifecycle event: `on` settles it with a value, `fail` events
 * reject it. Tracked like the waits above, so the stand cancels it when it closes the client.
 */
function waitForLifecycle<T>(
  client: Socket,
  what: string,
  timeoutMs: number,
  subscribe: (resolve: (value: T) => void, reject: (error: Error) => void) => () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      unsubscribe();
      untrack();
    };
    const untrack = track(client, cleanup);
    // cleanup() runs only from callbacks, after the consts below are initialised.
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${String(timeoutMs)} ms waiting for ${what}`));
    }, timeoutMs);
    const unsubscribe = subscribe(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

/**
 * Resolves with the reason once `client` loses its connection (`transport close`, `io client
 * disconnect`, ...). Start waiting before the cause; rejects at once if it is not connected.
 */
export function waitForDisconnect(
  client: Socket,
  timeoutMs: number = EVENT_TIMEOUT_MS,
): Promise<string> {
  if (!client.connected) {
    return Promise.reject(new Error(`${describeClient(client)} is not connected`));
  }
  return waitForLifecycle(
    client,
    `the disconnect of ${describeClient(client)}`,
    timeoutMs,
    (done) => {
      const onDisconnect = (reason: string): void => {
        done(reason);
      };
      client.on('disconnect', onDisconnect);
      return () => client.off('disconnect', onDisconnect);
    },
  );
}

/**
 * Resolves on the next `connect` of a client that socket.io is reconnecting by itself (one from
 * `stand.connect(app, label, { through: link })` after `link.drop()`). Rejects on timeout, when
 * the Manager gives up (`reconnect_failed`), or at once if the client will not reconnect (it is
 * connected, it was disconnected on purpose, or it has no reconnection).
 */
export function waitForReconnect(
  client: Socket,
  timeoutMs: number = EVENT_TIMEOUT_MS,
): Promise<void> {
  const who = describeClient(client);
  if (client.connected) return Promise.reject(new Error(`${who} is still connected`));
  // `active` alone is not enough: it stays true after a transport loss without reconnection too.
  if (!client.active || !client.io.reconnection()) {
    return Promise.reject(new Error(`${who} is not reconnecting`));
  }
  return waitForLifecycle(client, `the reconnect of ${who}`, timeoutMs, (done, fail) => {
    const onConnect = (): void => {
      done(undefined);
    };
    const onFailed = (): void => {
      fail(new Error(`${who} gave up reconnecting`));
    };
    // `disconnect()` on a client that is reconnecting emits no `disconnect`; its Manager closes
    // with `forced close` and stops retrying, so the wait settles now, not at its timeout.
    const onClose = (reason: string): void => {
      if (reason === 'forced close') fail(new Error(`${who} was disconnected while reconnecting`));
    };
    client.once('connect', onConnect);
    client.io.once('reconnect_failed', onFailed);
    client.io.on('close', onClose);
    return () => {
      client.off('connect', onConnect);
      client.io.off('reconnect_failed', onFailed);
      client.io.off('close', onClose);
    };
  });
}

/** `promise`, or a rejection naming `what` after `timeoutMs`: for waits that are not events. */
export function withTimeout<T>(
  promise: Promise<T>,
  what: string,
  timeoutMs: number = EVENT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out after ${String(timeoutMs)} ms waiting for ${what}`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}
