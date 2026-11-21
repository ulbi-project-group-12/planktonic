import { z } from 'zod';

/** Channel address in URLs: its uuid (the name can change, the id cannot). */
export const ChannelId = z.uuid().brand<'ChannelId'>();

export type ChannelId = z.infer<typeof ChannelId>;
