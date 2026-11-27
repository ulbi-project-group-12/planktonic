const ws = (slug: string) => `/workspaces/${slug}`;
const project = (slug: string, key: string) => `${ws(slug)}/projects/${key}`;
// Any origin works: it only has to differ from every real one.
const IN_APP_ORIGIN = 'http://in-app.invalid';

/** One pass of the browser's URL parser: the normalised address, or `undefined` for another site. */
function parseInApp(value: string): string | undefined {
  if (!value.startsWith('/')) return undefined;
  try {
    const url = new URL(value, IN_APP_ORIGIN);
    return url.origin === IN_APP_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * `value` as an address of this app, or `undefined`. Parsed the way the browser will parse it, so
 * `//host`, `/\\host` and a tab or line break hidden after the first slash are all recognised
 * as another site. The router parses the result once more, so the result must survive a second
 * pass unchanged: `/a/..//host` normalises to `//host`, which the second pass rejects.
 */
function inAppPath(value: string | null | undefined): string | undefined {
  const path = value ? parseInApp(value) : undefined;
  return path !== undefined && parseInApp(path) === path ? path : undefined;
}

const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value) params.set(name, value);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

// Only addresses that exist in `app/`. Add a builder together with its route.
export const routes = {
  // Public
  home: () => '/',
  prototype: () => '/prototype',
  /** Outside the shell, but behind the login: only a signed-in user accepts an invite. */
  invite: (token: string) => `/invite/${encodeURIComponent(token)}`,
  /** Without a token: the "confirm your email" screen. With a token: the link page. */
  verifyEmail: (token?: string) => withQuery('/verify-email', { token }),

  // Auth
  /** `next`: the in-app address to return to after signing in (see `afterLogin`). */
  login: (next?: string) => withQuery('/login', { next: inAppPath(next) }),
  /**
   * Where the login form goes after a successful sign-in: `next` from the query when it is an
   * address of this app, the workspace list otherwise. An absolute or protocol-relative URL is
   * never followed, so a crafted link cannot send a signed-in user to another site.
   */
  afterLogin: (next?: string | null) => {
    const path = inAppPath(next);
    return path && !path.startsWith('/login') ? path : '/workspaces';
  },
  register: (next?: string) => withQuery('/register', { next: inAppPath(next) }),
  forgotPassword: () => '/forgot-password',
  resetPassword: (token?: string) => withQuery('/reset-password', { token }),

  // Account
  profileSettings: () => '/settings/profile',
  devicesSettings: () => '/settings/devices',
  notificationSettings: () => '/settings/notifications',
  appearanceSettings: () => '/settings/appearance',

  // Workspaces
  workspaces: () => '/workspaces',
  workspaceCreate: () => '/workspaces/create',
  workspace: (slug: string) => ws(slug),
  workspaceMembers: (slug: string) => `${ws(slug)}/members`,
  workspaceSettings: (slug: string) => `${ws(slug)}/settings`,

  // Projects
  projectCreate: (slug: string) => `${ws(slug)}/projects/create`,
  project: (slug: string, key: string) => project(slug, key),
  projectMembers: (slug: string, key: string) => `${project(slug, key)}/members`,

  // Channels: a channel belongs to the workspace (ADR-0003), so its address has no project key.
  channelCreate: (slug: string, key: string) => `${project(slug, key)}/channels/create`,
  channel: (slug: string, channelId: string, opts?: { message?: string; thread?: string }) =>
    withQuery(`${ws(slug)}/channels/${channelId}`, {
      message: opts?.message,
      thread: opts?.thread,
    }),
} as const;
