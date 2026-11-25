export interface TimeZoneOption {
  /** IANA-имя, уходит в PATCH. */
  value: string;
  /** То, что видит и ищет пользователь: 'Europe/Berlin (UTC+1)'. */
  label: string;
}

// V8's supportedValuesOf lists geographical zones only: 'UTC' is a valid IANA id but is not
// in the catalog, so it is prepended here (the Set also guards engines that do list it).
export const TIMEZONES: string[] = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])];

/**
    * The UTC offset of a zone on a given date ('GMT+3', 'GMT-5', 'GMT'). Daylight saving 
   makes it
    * a property of the moment: Berlin is UTC+1 in winter and UTC+2 in summer.
    */
function utcOffsetLabel(timeZone: string, date: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');

  return part?.value.replace('GMT', 'UTC') ?? 'UTC';
}

const now = new Date();

export const TIMEZONE_OPTIONS: TimeZoneOption[] = TIMEZONES.map((tz) => ({
  value: tz,
  label: `${tz} (${utcOffsetLabel(tz, now)})`,
}));

/** Fallback for the form default when the profile has no tz yet. */
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
