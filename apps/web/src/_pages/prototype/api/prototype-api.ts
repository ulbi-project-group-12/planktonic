import {
  type CatchUpPage,
  type CreateMessageBody,
  type GetMessagesQueryInput,
  GetMessagesResponse,
  MessageResponse,
} from '@app/contracts';
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

/**
 * One page of the channel's messages: `GET` with `?afterSeq=&limit=` when given (UL-130). An
 * invalid payload throws, like a failed request, so the caller can retry; so does a message of
 * another channel, which this page must never show.
 */
export async function fetchMessages(
  channelId: string,
  query: GetMessagesQueryInput = {},
  signal?: AbortSignal,
): Promise<CatchUpPage> {
  const search = new URLSearchParams();
  if (query.afterSeq !== undefined) search.set('afterSeq', query.afterSeq);
  if (query.limit !== undefined) search.set('limit', query.limit);
  const suffix = search.size === 0 ? '' : `?${search.toString()}`;
  const res = await fetch(`${messagesUrl(channelId)}${suffix}`, {
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
  if (result.data.messages.some((message) => message.channelId !== channelId)) {
    throw new Error('GET messages returned a message of another channel');
  }
  return result.data;
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
 * `POST` a message and return the stored copy. Every failure is a `SendMessageError`, except a
 * fetch rejection of any other kind (such as an `AbortError`), which is rethrown unchanged:
 * - `network`: fetch rejected with a TypeError (offline, DNS, connection refused);
 * - `timeout`: no answer within `REQUEST_TIMEOUT_MS` (`AbortSignal.timeout`'s TimeoutError);
 * - `server`: 5xx, 408 or 429, the server could not take it right now;
 * - `rejected`: any other 4xx, the server refused this message (the only final kind);
 * - `invalid-response`: a 201 whose body is not JSON, not a valid message or not the message that
 *   was sent (another `clientMsgId` or channel), or a non-201 2xx/3xx.
 * Everything but `rejected` may be retried with the same `clientMsgId`: the server is idempotent
 * on (author, clientMsgId), so a resend after a lost or malformed 201 loses nothing and adds nothing.
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
    // A structural check: `instanceof DOMException` can fail across realms (jsdom vs Node).
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'TimeoutError'
    ) {
      throw new SendMessageError('timeout', { cause: error });
    }
    if (error instanceof TypeError) throw new SendMessageError('network', { cause: error });
    throw error;
  }
  const { status } = res;
  if (status !== 201) {
    if (status >= 500 || status === 408 || status === 429) {
      throw new SendMessageError('server', { status });
    }
    if (status >= 400) throw new SendMessageError('rejected', { status });
    throw new SendMessageError('invalid-response', { status });
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch (error) {
    throw new SendMessageError('invalid-response', { status, cause: error });
  }
  const result = MessageResponse.safeParse(body);
  if (!result.success) {
    console.warn('prototype: invalid POST message response', result.error);
    throw new SendMessageError('invalid-response', { status, cause: result.error });
  }
  // The feed replaces the local row by `clientMsgId`, so a 201 for another key or channel would
  // leave that row on "Sending…" forever. Treat it as a malformed answer: the row fails with Retry.
  // Both ids are compared lower-cased: the server stores the key lower-cased (UL-126).
  if (
    result.data.clientMsgId.toLowerCase() !== payload.clientMsgId.toLowerCase() ||
    result.data.channelId.toLowerCase() !== channelId.toLowerCase()
  ) {
    console.warn('prototype: POST message response is for another message');
    throw new SendMessageError('invalid-response', { status });
  }
  return result.data;
}

/**
 * The text and Retry flag a failed row shows. The reason comes from a fixed table, never from the
 * response body or `error.message`: server text is not shown to the user. Unknown errors may be
 * retried, since the server is idempotent on (author, clientMsgId).
 */
export function classifySendError(error: unknown): SendFailure {
  if (!(error instanceof SendMessageError)) {
    return { retryable: true, reason: 'something went wrong' };
  }
  return { retryable: error.retryable, reason: sendErrorReason(error) };
}

/** `text`, plus the HTTP status in parentheses when it is known. */
function withStatus(text: string, status: number | undefined): string {
  return status === undefined ? text : `${text} (${String(status)})`;
}

function rejectedText(status: number | undefined): string {
  switch (status) {
    case 404:
      return 'the channel was not found';
    case 409:
      return 'this message key was already used in another channel';
    case 413:
      return 'the message is too large';
    default:
      return 'the server rejected the message';
  }
}

function sendErrorReason({ kind, status }: SendMessageError): string {
  switch (kind) {
    case 'network':
      return 'no connection to the server';
    case 'timeout':
      return 'the server did not answer in time';
    case 'server':
      return withStatus('the server is unavailable right now', status);
    case 'rejected':
      return withStatus(rejectedText(status), status);
    case 'invalid-response':
      return 'the server sent an unexpected response';
  }
}
