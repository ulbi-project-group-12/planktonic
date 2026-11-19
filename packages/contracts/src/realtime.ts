import { z } from 'zod';
import { MessageResponse } from './message.js';

/** Socket event names the server emits (STACK §3.4). One place, so api and web never drift. */
export const MESSAGE_NEW_EVENT = 'message:new';

/**
 * `message:new`: a message was committed in a channel the socket's room covers (`channel:{id}`).
 * It carries the full message, the same object the `POST` returns (STACK §4.3), so a client needs
 * no follow-up request. Every member of the room gets it, the sender's own sockets included: the
 * client merges it with the `POST` response by `id` (UL-128).
 */
export const MessageNewEvent = z.object({
  message: MessageResponse,
});

export type MessageNewEvent = z.infer<typeof MessageNewEvent>;

/**
 * Server → client events, used as `Server<ClientToServerEvents, ServerToClientEvents>` in the api
 * and `Socket<ServerToClientEvents, ClientToServerEvents>` in the web client.
 */
export interface ServerToClientEvents {
  [MESSAGE_NEW_EVENT]: (event: MessageNewEvent) => void;
}

/** Client → server events. None yet: sending goes over REST, the socket only delivers. */
export type ClientToServerEvents = Record<string, never>;
