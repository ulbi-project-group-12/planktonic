import { describe, expect, it } from 'vitest';
import { routes } from './routes';

describe('routes', () => {
  it('nests workspaces under /workspaces', () => {
    expect(routes.workspace('my-team')).toBe('/workspaces/my-team');
    expect(routes.workspaceCreate()).toBe('/workspaces/create');
  });

  it('builds project addresses by key', () => {
    expect(routes.project('my-team', 'WEB')).toBe('/workspaces/my-team/projects/WEB');
    expect(routes.projectMembers('my-team', 'WEB')).toBe(
      '/workspaces/my-team/projects/WEB/members',
    );
    expect(routes.channelCreate('my-team', 'WEB')).toBe(
      '/workspaces/my-team/projects/WEB/channels/create',
    );
  });

  it('keeps account settings outside the workspace', () => {
    expect(routes.profileSettings()).toBe('/settings/profile');
    expect(routes.devicesSettings()).toBe('/settings/devices');
  });

  it('builds the invite address from the token', () => {
    expect(routes.invite('abc123')).toBe('/invite/abc123');
    expect(routes.invite('a/b+c')).toBe('/invite/a%2Fb%2Bc');
  });

  it('adds the token to email links only when it is given', () => {
    expect(routes.verifyEmail()).toBe('/verify-email');
    expect(routes.verifyEmail('t1')).toBe('/verify-email?token=t1');
    expect(routes.resetPassword()).toBe('/reset-password');
    expect(routes.resetPassword('t1')).toBe('/reset-password?token=t1');
  });

  it('addresses a channel by workspace and id, without the project', () => {
    const base = '/workspaces/my-team/channels/c1';
    expect(routes.channel('my-team', 'c1')).toBe(base);
    expect(routes.channel('my-team', 'c1', { message: 'm1' })).toBe(`${base}?message=m1`);
    expect(routes.channel('my-team', 'c1', { thread: 't1' })).toBe(`${base}?thread=t1`);
    expect(routes.channel('my-team', 'c1', { message: 'm1', thread: 't1' })).toBe(
      `${base}?message=m1&thread=t1`,
    );
  });

  it('never writes "undefined" into a query string', () => {
    expect(routes.channel('my-team', 'c1', {})).not.toContain('undefined');
  });
});
