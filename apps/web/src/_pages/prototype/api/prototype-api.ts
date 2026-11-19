import { type CreateMessageBody, GetMessagesResponse, MessageResponse } from '@app/contracts';

// Relative URLs only: the page, /api and /socket.io share one origin through Traefik, so fetch's
// default same-origin credentials carry the io_srv sticky cookie and no CORS is involved.

function messagesUrl(channelId: string): string {
  return `/api/channels/${encodeURIComponent(channelId)}/messages`;
}

/**
 * `GET /api/health` and its `instanceId`. Traefik sets the `io_srv` cookie on this response, so
 * the socket handshake that follows lands on the same replica.
 */
export async function fetchInstanceId(signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/health', { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/health failed with ${String(res.status)}`);
  const payload: unknown = await res.json();
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'instanceId' in payload &&
    typeof payload.instanceId === 'string'
  ) {
    return payload.instanceId;
  }
  throw new Error('GET /api/health returned no instanceId');
}

/** The channel's messages; an invalid payload is logged and treated as empty. */
export async function fetchMessages(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly MessageResponse[]> {
  const res = await fetch(messagesUrl(channelId), { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`GET messages failed with ${String(res.status)}`);
  const payload: unknown = await res.json();
  const result = GetMessagesResponse.safeParse(payload);
  if (!result.success) {
    console.warn('prototype: ignoring invalid GET messages payload', result.error);
    return [];
  }
  return result.data.messages;
}

/**
 * `POST` a message and return the stored copy. Anything but a valid `201` throws: a resend with
 * the same `clientMsgId` is idempotent on the server, so treating a malformed `201` as a failure
 * loses nothing.
 */
export async function sendMessage(
  channelId: string,
  payload: CreateMessageBody,
): Promise<MessageResponse> {
  const res = await fetch(messagesUrl(channelId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status !== 201) throw new Error(`POST message failed with ${String(res.status)}`);
  const body: unknown = await res.json();
  const result = MessageResponse.safeParse(body);
  if (!result.success) {
    console.warn('prototype: invalid POST message response', result.error);
    throw new Error('POST message returned an invalid message');
  }
  return result.data;
}
