import { z } from 'zod';

/**
 * Response body of POST /api/auth/refresh.
 *
 * The refresh token itself travels in an httpOnly cookie and never appears in
 * the response body; the endpoint only returns a new short-lived access token.
 */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/** 401 returned for missing, malformed, expired or revoked refresh credentials. */
export const RefreshUnauthorizedResponseSchema = z.object({
  statusCode: z.literal(401),
  message: z.literal('Unauthorized'),
  error: z.literal('Unauthorized'),
});

/** 503 returned when the server has no refresh signing secret configured. */
export const RefreshUnavailableResponseSchema = z.object({
  statusCode: z.literal(503),
  message: z.literal('Refresh is unavailable'),
  error: z.literal('Service Unavailable'),
});
