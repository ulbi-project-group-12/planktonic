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
 * The zone catalog of this runtime. `Intl.supportedValuesOf('timeZone')` is what the pickers are
 * built from; 'UTC' is a valid id that V8 does not list, so it is added (the same set the web's
 * timezones.ts builds).
 */
const TIME_ZONE_IDS = new Set(['UTC', ...Intl.supportedValuesOf('timeZone')]);

/**
 * `Area/Location` with capitalised segments, as every IANA name outside the legacy one-word links
 * is spelled. Keeps out what `Intl.DateTimeFormat` also takes but is not a zone name: offsets
 * ('+05:00'), abbreviations ('EST') and lowercase spellings ('europe/berlin').
 */
const IANA_NAME = /^[A-Z][A-Za-z0-9_+-]*(?:\/[A-Z][A-Za-z0-9_+-]*){1,2}$/;

/** The one part of Temporal used here; not every engine or TypeScript lib has it yet. */
interface TemporalLike {
  ZonedDateTime: new (epochNanoseconds: bigint, timeZone: string) => { timeZoneId: string };
}

/**
 * The catalog alone is not enough: each engine lists one spelling per zone and they disagree.
 * Node and Chrome list 'Europe/Kiev' and 'Asia/Calcutta', Firefox lists 'Europe/Kyiv' and
 * 'Asia/Kolkata', so a zone picked in one browser would be refused by the api. Every engine
 * resolves both spellings, so a name outside the catalog is accepted when it has the IANA shape
 * and the engine knows it under exactly that spelling.
 *
 * Zone ids are matched case-insensitively by the engine, so the case is checked separately.
 * Temporal (Node, where the api validates) returns the id it was given in its proper case, link
 * names included: 'Europe/KYIV' comes back as 'Europe/Kyiv'. Without Temporal, `Intl` returns the
 * listed spelling, which only shows a wrong case of a listed name ('Europe/BERLIN'), not of a
 * link name.
 */
function isIanaTimeZone(tz: string): boolean {
  if (TIME_ZONE_IDS.has(tz)) return true;
  if (!IANA_NAME.test(tz)) return false;
  try {
    const temporal = (globalThis as { Temporal?: TemporalLike }).Temporal;
    if (temporal) return new temporal.ZonedDateTime(0n, tz).timeZoneId === tz;
    const resolved = new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone;
    return resolved === tz || resolved.toLowerCase() !== tz.toLowerCase();
  } catch {
    return false;
  }
}

export const TimeZone = z
  .string()
  .max(TIME_ZONE_MAX_LENGTH)
  .refine(isIanaTimeZone, 'Expected an IANA time zone like Europe/Berlin')
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
