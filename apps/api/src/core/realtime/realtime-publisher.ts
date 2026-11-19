import type { ServerToClientEvents } from '@app/contracts';

/**
 * How services push realtime events (STACK §3.1, §4.2). A service depends on this token and never
 * on the gateway: the api binds it to the Socket.IO server, a future worker to a Redis relay.
 *
 * Delivery is at most once. Callers publish only after their transaction commits, and a lost
 * event is healed by the client (a `seq` gap or the reconnect catch-up, STACK §4.3/§4.4), so
 * `publish` never throws into the request that triggered it.
 */
export abstract class RealtimePublisher {
  abstract publish<E extends keyof ServerToClientEvents>(
    room: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void;
}
