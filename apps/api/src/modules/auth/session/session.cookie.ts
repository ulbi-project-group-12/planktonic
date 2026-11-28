export const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export function parseRefreshCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE_NAME) {
      const value = rest.join('=');
      if (!value) return undefined;
      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function refreshCookieValue(token: string, secure: boolean): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api/auth',
    `Max-Age=${String(REFRESH_TTL_SECONDS)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearRefreshCookie(secure: boolean): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api/auth',
    'Max-Age=0',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
