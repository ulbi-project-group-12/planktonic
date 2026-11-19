// A TCP link between a test client and an app that a test can cut, to lose a connection the way a
// network does (UL-133). Socket.IO clients connect to `link.url`; the link pipes bytes to the app.
//
// `drop()` resets both sides of every open connection and every new one until `restore()`. Neither
// end sends a socket.io DISCONNECT packet or a WebSocket close frame: the client's transport just
// dies, as when Wi-Fi goes away or a NAT forgets the flow and the kernel notices. So the server
// sees `transport close`, not `client namespace disconnect`, and the client's Manager keeps trying
// to reconnect, to the same app, once the link is back. `client.disconnect()` would be the clean
// way out instead: the server is told goodbye and socket.io never reconnects on its own.
//
// A blackhole (stop forwarding, keep the sockets) would be closer to a cable pulled out, but the
// server would notice only after pingInterval + pingTimeout (45 s by default), far past any test
// timeout. A reset is the same loss, noticed at once.
import { type AddressInfo, connect, createServer, type Socket } from 'node:net';

export interface NetworkLink {
  /** `http://127.0.0.1:<port>`, for a Socket.IO client. */
  readonly url: string;
  /** The app's URL the link forwards to. */
  readonly target: string;
  /** Resets every open connection, and every new one until `restore()`. */
  drop(): void;
  /** Forwards new connections again. */
  restore(): void;
  /** Drops everything and stops listening. Idempotent. */
  close(): Promise<void>;
}

/** Opens a link on 127.0.0.1, port 0, to `target` (an app's `getUrl()`). */
export async function openLink(target: string): Promise<NetworkLink> {
  const { hostname, port } = new URL(target);
  const pairs = new Set<Socket>();
  let up = true;
  let closed = false;

  const reset = (socket: Socket): void => {
    pairs.delete(socket);
    // RST, not FIN: nothing more from this connection reaches either side.
    socket.resetAndDestroy();
  };

  const server = createServer({ noDelay: true }, (inbound) => {
    if (!up) {
      reset(inbound);
      return;
    }
    const outbound = connect({ host: hostname, port: Number(port), noDelay: true });
    pairs.add(inbound);
    pairs.add(outbound);
    // Like a single TCP flow: a clean end (FIN) travels through `pipe`, after what was still
    // queued (say a server's DISCONNECT packet and close frame); a failure on one side takes
    // the other with it at once.
    const teardown = (): void => {
      pairs.delete(inbound);
      pairs.delete(outbound);
      inbound.destroy();
      outbound.destroy();
    };
    // A clean close ends only that socket: the peer may still flush what it has queued, so it
    // stays in `pairs` (and in reach of drop()/close()) until its own close.
    const closed =
      (socket: Socket) =>
      (hadError: boolean): void => {
        if (hadError) {
          teardown();
          return;
        }
        pairs.delete(socket);
      };
    inbound.on('error', teardown);
    outbound.on('error', teardown);
    inbound.on('close', closed(inbound));
    outbound.on('close', closed(outbound));
    inbound.pipe(outbound);
    outbound.pipe(inbound);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${String(address.port)}`,
    target,
    drop() {
      up = false;
      for (const socket of [...pairs]) reset(socket);
    },
    restore() {
      if (!closed) up = true;
    },
    async close() {
      if (closed) return;
      closed = true;
      up = false;
      for (const socket of [...pairs]) reset(socket);
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}
