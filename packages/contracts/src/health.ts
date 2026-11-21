import { z } from 'zod';

/**
 * `GET /api/health` (liveness): the terminus result with no indicators, plus the id of the replica
 * that answered (UL-123).
 */
export const HealthResponse = z.object({
  status: z.literal('ok'),
  info: z.strictObject({}),
  error: z.strictObject({}),
  details: z.strictObject({}),
  instanceId: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
