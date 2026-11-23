import { z } from 'zod';

export const MeResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
