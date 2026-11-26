import { z } from 'zod';

/** Shortest display name, in characters (after trimming). */
export const USER_NAME_MIN_LENGTH = 2;

/** Longest display name, in characters (after trimming). */
export const USER_NAME_MAX_LENGTH = 15;

export const UserName = z
  .string()
  .trim()
  .min(USER_NAME_MIN_LENGTH)
  .max(USER_NAME_MAX_LENGTH)
  // PostgreSQL text cannot store U+0000: without this check the insert fails with a 500.
  .refine((name) => !name.includes('\u0000'), 'Name must not contain a null character');

export type UserName = z.infer<typeof UserName>;

/** Upper bound for a time zone id: the longest IANA name is 32 characters. */
export const TIME_ZONE_MAX_LENGTH = 64;

/**
 * Canonical IANA zone ids the api stores. `Intl.supportedValuesOf('timeZone')` is the catalog the
 * pickers are built from; 'UTC' is a valid id that V8 does not list, so it is added (the same set
 * the web's timezones.ts builds). Validating membership — rather than just asking
 * `Intl.DateTimeFormat`, which also accepts lowercase aliases and offsets like '+05:00' — keeps the
 * stored value canonical.
 */
const TIME_ZONE_IDS = new Set(['UTC', ...Intl.supportedValuesOf('timeZone')]);

export const TimeZone = z
  .string()
  .max(TIME_ZONE_MAX_LENGTH)
  .refine((tz) => TIME_ZONE_IDS.has(tz), 'Expected an IANA time zone like Europe/Berlin')
  .brand<'TimeZone'>();

export type TimeZone = z.infer<typeof TimeZone>;

export const UpdateMeRequestSchema = z
  .object({
    name: UserName.meta({
      description: 'Display name. Leading and trailing whitespace is trimmed.',
      example: 'Ada',
    }).optional(),
    tz: TimeZone.meta({
      description: 'IANA time zone id.',
      example: 'Europe/Berlin',
    }).optional(),
  })
  .refine((body) => body.name !== undefined || body.tz !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;
