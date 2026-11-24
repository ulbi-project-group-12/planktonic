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

  it('carries the return address to the login screen', () => {
    expect(routes.login()).toBe('/login');
    expect(routes.login('/workspaces/my-team?tab=1')).toBe(
      '/login?next=%2Fworkspaces%2Fmy-team%3Ftab%3D1',
    );
  });

  it('returns to an in-app address after login', () => {
    expect(routes.afterLogin('/workspaces/my-team?tab=1')).toBe('/workspaces/my-team?tab=1');
  });

  it.each([
    ['/workspaces/a/../my-team', '/workspaces/my-team'],
    ['/workspaces/my-team?next=//evil.example', '/workspaces/my-team?next=//evil.example'],
    ['/workspaces/%2F%2Fevil.example', '/workspaces/%2F%2Fevil.example'],
    ['/workspaces/my-team#//evil.example', '/workspaces/my-team#//evil.example'],
  ])('keeps the in-app address %s as %s', (next, expected) => {
    expect(routes.afterLogin(next)).toBe(expected);
    // What the router would open stays on this origin.
    expect(new URL(expected, 'https://app.example').origin).toBe('https://app.example');
  });

  it('keeps the query and the hash of the return address', () => {
    expect(routes.afterLogin('/workspaces/my-team/channels/c1?thread=t1#m2')).toBe(
      '/workspaces/my-team/channels/c1?thread=t1#m2',
    );
  });

  it.each([
    undefined,
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r\\evil.example',
    '/a/..//evil.example',
    '/.//evil.example',
    '/%2e%2e//evil.example',
    '/a/%2E%2E//evil.example',
    '/a/..\\\\evil.example',
    '/a/../\\evil.example',
    '///evil.example',
    '/\\/evil.example',
    '/\t\\evil.example',
    '/a/..\t//evil.example',
    ' //evil.example',
    'javascript:alert(1)',
    '/\\javascript:alert(1)',
    'http:evil.example',
    'workspaces',
    '/login?next=%2Flogin',
    '/a/../login',
  ])('falls back to the workspace list after login for %j', (next) => {
    expect(routes.afterLogin(next)).toBe('/workspaces');
  });

  it('never writes "undefined" into a query string', () => {
    expect(routes.channel('my-team', 'c1', {})).not.toContain('undefined');
  });
});
