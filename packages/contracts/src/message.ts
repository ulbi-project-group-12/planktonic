import { z } from 'zod';

/** Upper bound for a message body, in characters. */
export const MESSAGE_BODY_MAX_LENGTH = 4000;

/** Body of `POST` a message. The channel comes from the path, the author from the session. */
export const CreateMessageBody = z.object({
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
