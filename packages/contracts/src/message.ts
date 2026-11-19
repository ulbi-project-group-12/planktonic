import { z } from 'zod';

/** Upper bound for a message body, in characters. */
export const MESSAGE_BODY_MAX_LENGTH = 4000;

/**
 * Idempotency key of a message: a UUIDv7 the client makes once per message (not per retry) and
 * sends again on every retry (UL-126, STACK §4.3). Unique per author, not globally.
 * Lowercased on parse: Postgres returns `uuid` in lowercase, so the key the client sent and the
 * key in the response compare equal as strings.
 */
export const ClientMsgId = z.uuidv7().toLowerCase();

export type ClientMsgId = z.infer<typeof ClientMsgId>;

/**
 * Body of `POST` a message. The channel comes from the path, the author from the session.
 *
 * Idempotent on `(author, clientMsgId)`: a retry with a key the author already used returns the
 * stored message (same `id`, same `seq`, `201` again) and creates nothing. The stored message is the
 * canonical answer, so a retry with a different `body` still gets the original back.
 */
export const CreateMessageBody = z.object({
  clientMsgId: ClientMsgId,
  body: z.string().min(1).max(MESSAGE_BODY_MAX_LENGTH),
});

export type CreateMessageBody = z.infer<typeof CreateMessageBody>;

/**
 * A channel sequence number on the wire: a decimal string, because it is `BigInt` in the database
 * and a JS number loses precision past 2^53 (UL-212).
 */
export const MessageSeq = z.string().regex(/^[1-9][0-9]*$/);

export type MessageSeq = z.infer<typeof MessageSeq>;

/** A message as the API returns it (also the `POST` response). */
export const MessageResponse = z.object({
  id: z.uuid(),
  /** Per-channel sequence number, gapless from "1" (`messages.seq` in the database). */
  seq: MessageSeq,
  channelId: z.uuid(),
  authorId: z.uuid(),
  /** The key the author sent with `POST`; lets the client match its pending message (UL-126). */
  clientMsgId: z.uuid(),
  body: z.string(),
  /** ISO 8601 timestamp. */
  createdAt: z.iso.datetime(),
});

export type MessageResponse = z.infer<typeof MessageResponse>;

/** Most messages one `GET` returns, and its default page size (STACK §4.4). */
export const MESSAGES_PAGE_LIMIT = 100;

/** Largest value of a Postgres `bigint`, the type of `messages.seq`. */
const SEQ_MAX = 2n ** 63n - 1n;

/**
 * Query of `GET` messages. Both fields arrive as strings (a query string has no numbers), so the
 * schema checks the digits itself instead of coercing: `Number('1e2')` or `Number(' 7 ')` would pass a
 * coercion and mean something the client never sent.
 *
 * - `afterSeq`: only messages with a greater `seq`, oldest first (the reconnect catch-up, UL-130).
 *   A decimal string like `MessageSeq`, but `"0"` is allowed ("after nothing") and it must fit a
 *   Postgres `bigint`, so an absurd value is a 400, not a database error. Absent: the newest page.
 * - `limit`: page size, `1..MESSAGES_PAGE_LIMIT`, default `MESSAGES_PAGE_LIMIT`.
 *
 * Unknown keys are dropped, not rejected: caches and proxies add their own.
 */
export const GetMessagesQuery = z.object({
  afterSeq: z
    .string()
    .regex(/^(0|[1-9][0-9]*)$/, 'afterSeq must be a non-negative integer')
    .max(19)
    // zod runs every check even after the regex fails, so the refine tests the digits again before
    // `BigInt` (which throws on anything else).
    .refine(
      (value) => !/^[0-9]+$/.test(value) || BigInt(value) <= SEQ_MAX,
      'afterSeq is out of range',
    )
    .optional(),
  limit: z
    .string()
    .regex(/^[1-9][0-9]*$/, 'limit must be a positive integer')
    .max(3)
    .transform(Number)
    .pipe(z.number().max(MESSAGES_PAGE_LIMIT))
    .default(MESSAGES_PAGE_LIMIT),
});

/** The query as the client writes it (strings), before parsing. */
export type GetMessagesQueryInput = z.input<typeof GetMessagesQuery>;
/** The parsed query: `limit` is a number with its default applied. */
export type GetMessagesQuery = z.output<typeof GetMessagesQuery>;

/**
 * `GET` response: one page of the channel's messages, always oldest first.
 *
 * `hasMore` says the page is not the whole range it was asked for:
 * - with `afterSeq`: more messages newer than the page exist (the client fell too far behind, so
 *   it drops its feed and loads the newest page instead of paging forward, UL-130);
 * - without `afterSeq` (the newest page): older messages exist.
 */
export const GetMessagesResponse = z.object({
  messages: z.array(MessageResponse),
  hasMore: z.boolean(),
});

export type GetMessagesResponse = z.infer<typeof GetMessagesResponse>;
