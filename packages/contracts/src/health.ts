import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  info: z.strictObject({}),
  error: z.strictObject({}),
  details: z.strictObject({}),
  instanceId: z.string(),
});
