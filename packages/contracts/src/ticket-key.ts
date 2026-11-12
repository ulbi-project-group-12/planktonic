import { z } from 'zod';

/** Tracker key: literal `UL-` plus a positive integer without leading zeros (e.g. `UL-12`). */
export const TICKET_KEY_PATTERN = /^UL-[1-9]\d*$/;

export const TicketKey = z
  .string()
  .regex(TICKET_KEY_PATTERN, { error: 'Expected a ticket key like UL-12' })
  .brand<'TicketKey'>();

export type TicketKey = z.infer<typeof TicketKey>;
