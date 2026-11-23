const ws = (slug: string) => `/workspaces/${slug}`;
const project = (slug: string, key: string) => `${ws(slug)}/projects/${key}`;
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
  invite: (token: string) => `/invite/${encodeURIComponent(token)}`,
  /** Without a token: the "confirm your email" screen. With a token: the link page. */
  verifyEmail: (token?: string) => withQuery('/verify-email', { token }),

  // Auth
  /** `next`: the in-app address to return to after signing in (see `afterLogin`). */
  login: (next?: string) => withQuery('/login', { next }),
  /**
   * Where the login form goes after a successful sign-in: `next` from the query when it is an
   * address of this app, the workspace list otherwise. An absolute or protocol-relative URL is
   * never followed, so a crafted link cannot send a signed-in user to another site.
   */
  afterLogin: (next?: string | null) =>
    next && /^\/(?![/\\])/.test(next) && !next.startsWith('/login') ? next : '/workspaces',
  register: () => '/register',
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
