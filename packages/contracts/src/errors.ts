import { z } from 'zod';

/**
 * `400` from the api's global validation pipe (`apps/api/src/app.setup.ts`) when a body, query or
 * param fails its contract: one issue per failed check, `path` dot-joined (`body`, `a.0.b`, `''` for
 * the value itself). Forms map `issues` onto their fields.
 */
export const ValidationErrorResponse = z.object({
  statusCode: z.literal(400),
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
});

export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponse>;

/**
 * Any other error the api raises with a Nest `HttpException` (`404` channel not found, `409` key
 * reused in another channel, ...): Nest's default body.
 */
export const HttpErrorResponse = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string(),
});

export type HttpErrorResponse = z.infer<typeof HttpErrorResponse>;
