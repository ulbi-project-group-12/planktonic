import type { ClientToServerEvents, ServerToClientEvents } from '@app/contracts';
import { io, type Socket } from 'socket.io-client';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | undefined;

/**
 * The tab's one Socket.IO client, created on first use with `autoConnect: false` on the page's
 * own origin (no URL: Traefik routes `/socket.io` to the api). Components add and remove their
 * own listeners and call `connect()`, which is a no-op when already connected or connecting; they
 * never disconnect it, because it lives as long as the tab.
 */
export function getSocket(): AppSocket {
  if (typeof window === 'undefined') {
    throw new Error('getSocket() runs in the browser only');
  }
  socket ??= io({ path: '/socket.io', autoConnect: false });
  return socket;
}
