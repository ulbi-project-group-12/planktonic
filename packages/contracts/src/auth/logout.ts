import { z } from 'zod';

/**
 * Response body of POST /api/auth/logout.
 * The server revokes the refresh credentials associated with the httpOnly cookie
 * and clears the cookie in the response.
 */
export const LogoutResponseSchema = z.object({});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
