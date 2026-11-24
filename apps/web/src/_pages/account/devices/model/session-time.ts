/**
 * Session timestamps render in the user's own timezone. Until UL-155 adds `tz` to the user,
 * the timezone is the browser's — every formatter below takes it explicitly so the switch is
 * a one-line change at the call site.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pluralRules = new Intl.PluralRules('ru');

function pluralize(count: number, forms: { one: string; few: string; many: string }): string {
  const category = pluralRules.select(count);
  return category === 'one' || category === 'few' ? forms[category] : forms.many;
}

/** The calendar year of `date` in `timeZone`: around New Year it differs between zones. */
function yearIn(date: Date, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(date);
}

/** "20 ноября в 14:32"; the year is only shown when it differs from `now`'s. */
function absolute(iso: string, timeZone: string | undefined, now: Date): string {
  const date = new Date(iso);
  const withYear = yearIn(date, timeZone) !== yearIn(now, timeZone);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

/** When the session was opened: an absolute "when", e.g. "20 ноября в 14:32". */
export function formatSignedInAt(iso: string, now: Date, timeZone?: string): string {
  return absolute(iso, timeZone, now);
}

/**
 * Last activity: relative while it is fresh ("только что", "N минут/часов назад") and
 * absolute from a day up — the caller re-renders every minute so the text stays honest.
 */
export function formatLastActiveAt(iso: string, now: Date, timeZone?: string): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < MINUTE) return 'только что';
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${String(minutes)} ${pluralize(minutes, { one: 'минуту', few: 'минуты', many: 'минут' })} назад`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${String(hours)} ${pluralize(hours, { one: 'час', few: 'часа', many: 'часов' })} назад`;
  }
  return absolute(iso, timeZone, now);
}
