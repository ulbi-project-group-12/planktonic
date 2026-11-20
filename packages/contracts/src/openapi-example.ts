import { z } from 'zod';

export const OpenApiExampleBody = z.object({ name: z.string().min(1) });
export type OpenApiExampleBody = z.infer<typeof OpenApiExampleBody>;

export const OpenApiExampleResponse = z.object({ greeting: z.string() });
export type OpenApiExampleResponse = z.infer<typeof OpenApiExampleResponse>;

export const ValidationErrorResponse = z.object({
  statusCode: z.literal(400),
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
});
