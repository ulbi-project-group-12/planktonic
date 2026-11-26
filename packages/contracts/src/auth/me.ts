import { z } from 'zod';
import { TimeZone } from '../user.js';

export const MeResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  tz: TimeZone,
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
