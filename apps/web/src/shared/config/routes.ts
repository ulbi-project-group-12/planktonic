const ws = (slug: string) => `/workspaces/${slug}`;
const project = (slug: string, key: string) => `${ws(slug)}/projects/${key}`;

export const routes = {
  // Public
  home: () => '/',
  prototype: () => '/prototype',
  invite: (token: string) => `/invite/${token}`,
  verifyEmail: () => '/verify-email',

  // Auth
  login: () => '/login',
  register: () => '/register',
  forgotPassword: () => '/forgot-password',
  resetPassword: () => '/reset-password',

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
  workspaceMessages: (slug: string) => `${ws(slug)}/messages`,
  conversation: (slug: string, conversationId: string) => `${ws(slug)}/messages/${conversationId}`,
  workspaceSaved: (slug: string) => `${ws(slug)}/saved`,
  workspaceMyWork: (slug: string) => `${ws(slug)}/my-work`,
  workspaceNotifications: (slug: string) => `${ws(slug)}/notifications`,
  workspaceActivity: (slug: string) => `${ws(slug)}/activity`,
  workspaceSearch: (slug: string) => `${ws(slug)}/search`,

  // Projects
  projectCreate: (slug: string) => `${ws(slug)}/projects/create`,
  project: (slug: string, key: string) => project(slug, key),
  projectMembers: (slug: string, key: string) => `${project(slug, key)}/members`,
  projectSettings: (slug: string, key: string) => `${project(slug, key)}/settings`,
  projectSettingsGithub: (slug: string, key: string) => `${project(slug, key)}/settings/github`,
  projectBoard: (slug: string, key: string) => `${project(slug, key)}/board`,
  projectTasks: (slug: string, key: string) => `${project(slug, key)}/tasks`,
  task: (slug: string, key: string, taskNumber: number) =>
    `${project(slug, key)}/tasks/${String(taskNumber)}`,
  projectStandups: (slug: string, key: string) => `${project(slug, key)}/standups`,
  standupDay: (slug: string, key: string, date: string) => `${project(slug, key)}/standups/${date}`,
  projectDecisions: (slug: string, key: string) => `${project(slug, key)}/decisions`,
  decision: (slug: string, key: string, decisionId: string) =>
    `${project(slug, key)}/decisions/${decisionId}`,

  // Channels
  channelCreate: (slug: string, key: string) => `${project(slug, key)}/channels/create`,
  channel: (
    slug: string,
    key: string,
    channelId: string,
    opts?: { message?: string; thread?: string },
  ) => {
    const params = new URLSearchParams();
    if (opts?.message) params.set('message', opts.message);
    if (opts?.thread) params.set('thread', opts.thread);
    const query = params.toString();
    return `${project(slug, key)}/channels/${channelId}${query ? `?${query}` : ''}`;
  },
} as const;
