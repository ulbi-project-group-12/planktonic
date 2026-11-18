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

/** `GET` response: the channel's messages. */
export const GetMessagesResponse = z.object({
  messages: z.array(MessageResponse),
});

export type GetMessagesResponse = z.infer<typeof GetMessagesResponse>;
