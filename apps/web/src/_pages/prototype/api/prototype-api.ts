import { type CreateMessageBody, GetMessagesResponse, MessageResponse } from '@app/contracts';
import type { SendFailure } from '../model/feed';

// Relative URLs only: the page, /api and /socket.io share one origin through Traefik, so fetch's
// default same-origin credentials carry the io_srv sticky cookie and no CORS is involved.

/** Upper bound for one request, so a hung replica shows an error instead of spinning forever. */
const REQUEST_TIMEOUT_MS = 10_000;

/** The caller's signal (if any) combined with the request timeout. */
function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function messagesUrl(channelId: string): string {
  return `/api/channels/${encodeURIComponent(channelId)}/messages`;
}

/**
 * `GET /api/health` and its `instanceId`. Traefik sets the `io_srv` cookie on this response, so
 * the socket handshake that follows lands on the same replica.
 */
export async function fetchInstanceId(signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/health', { signal: requestSignal(signal), cache: 'no-store' });
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

/** The channel's messages. An invalid payload throws, like a failed request, so the page can retry. */
export async function fetchMessages(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly MessageResponse[]> {
  const res = await fetch(messagesUrl(channelId), {
    signal: requestSignal(signal),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET messages failed with ${String(res.status)}`);
  const payload: unknown = await res.json();
  const result = GetMessagesResponse.safeParse(payload);
  if (!result.success) {
    console.warn('prototype: invalid GET messages payload', result.error);
    throw new Error('GET messages returned an invalid payload');
  }
  return result.data.messages;
}

/** Why a `POST` message failed. Only `rejected` is final; every other kind may be retried. */
export type SendErrorKind = 'network' | 'timeout' | 'server' | 'rejected' | 'invalid-response';

export class SendMessageError extends Error {
  readonly kind: SendErrorKind;
  readonly status: number | undefined;
  readonly retryable: boolean;

  constructor(kind: SendErrorKind, options: { status?: number; cause?: unknown } = {}) {
    const suffix = options.status === undefined ? '' : ` (${String(options.status)})`;
    super(`POST message failed: ${kind}${suffix}`, { cause: options.cause });
    this.name = 'SendMessageError';
    this.kind = kind;
    this.status = options.status;
    this.retryable = kind !== 'rejected';
  }
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
  let res: Response;
  try {
    res = await fetch(messagesUrl(channelId), {
      method: 'POST',
      signal: requestSignal(),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError) throw new SendMessageError('network', { cause: error });
    throw error;
  }
  if (res.status !== 201) throw new Error(`POST message failed with ${String(res.status)}`);
  const body: unknown = await res.json();
  const result = MessageResponse.safeParse(body);
  if (!result.success) {
    console.warn('prototype: invalid POST message response', result.error);
    throw new Error('POST message returned an invalid message');
  }
  return result.data;
}

/**
 * The text and Retry flag a failed row shows. The reason comes from a fixed table, never from the
 * response body or `error.message`: server text is not shown to the user. Unknown errors may be
 * retried, since the server is idempotent on (author, clientMsgId).
 */
export function classifySendError(error: unknown): SendFailure {
  if (error instanceof SendMessageError) {
    switch (error.kind) {
      case 'network':
        return { retryable: error.retryable, reason: 'no connection to the server' };
      default:
        break;
    }
  }
  return { retryable: true, reason: 'something went wrong' };
}
