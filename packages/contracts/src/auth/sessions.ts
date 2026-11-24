import { z } from 'zod';

/**
 * One signed-in device of the account, as the "Devices" settings screen shows it.
 *
 * Draft: the screen (UL-223) runs on a mock of this shape; UL-157 builds the API and may adjust
 * it. Deliberately absent: the refresh-token hash, the raw `User-Agent` and the IP address.
 */
export const AuthSessionSchema = z.object({
  id: z.uuid().meta({ description: 'Session id: the `sid` claim of its access tokens.' }),
  browser: z.string().nullable().meta({
    description: 'Browser name and major version parsed from `User-Agent`; null when unknown.',
    example: 'Chrome 130',
  }),
  os: z.string().nullable().meta({
    description: 'Operating system parsed from `User-Agent`; null when unknown.',
    example: 'Windows 11',
  }),
  signedInAt: z.iso.datetime().meta({ description: 'When the sign-in created the session, UTC.' }),
  lastActiveAt: z.iso
    .datetime()
    .meta({ description: 'When the session last refreshed its token, UTC.' }),
  isCurrent: z.boolean().meta({
    description:
      'The session of the access token that made this request. It ends through sign-out only.',
  }),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

/** `GET /api/auth/sessions`: the active sessions of the caller, most recently active first. */
export const AuthSessionsResponseSchema = z.array(AuthSessionSchema);

export type AuthSessionsResponse = z.infer<typeof AuthSessionsResponseSchema>;

/** `DELETE /api/auth/sessions/:sessionId`. */
export const AuthSessionParamsSchema = z.object({ sessionId: z.uuid() });

export type AuthSessionParams = z.infer<typeof AuthSessionParamsSchema>;
