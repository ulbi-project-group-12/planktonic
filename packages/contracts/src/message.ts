import { z } from 'zod';

/** Upper bound for a message body, in characters. */
export const MESSAGE_BODY_MAX_LENGTH = 4000;

/** Body of `POST` a message. The channel comes from the path, the author from the session. */
export const CreateMessageBody = z.object({
  body: z.string().min(1).max(MESSAGE_BODY_MAX_LENGTH),
});

export type CreateMessageBody = z.infer<typeof CreateMessageBody>;

/** A message as the API returns it (also the `POST` response). */
export const MessageResponse = z.object({
  id: z.uuid(),
  /** Per-channel sequence number (`message.sec` in the database). */
  seq: z.number().int().nonnegative(),
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
