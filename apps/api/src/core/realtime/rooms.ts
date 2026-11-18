/**
 * Socket.IO room names (STACK §4.1). Rooms are joined server-side only; a client never names one.
 * Every emitter builds the name here, so producers and the gateway cannot disagree on its form.
 */
export function channelRoom(channelId: string): `channel:${string}` {
  return `channel:${channelId}`;
}
