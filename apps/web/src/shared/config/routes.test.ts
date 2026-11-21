import { describe, expect, it } from 'vitest';
import { routes } from './routes';

describe('routes', () => {
  it('nests workspaces under /workspaces', () => {
    expect(routes.workspace('my-team')).toBe('/workspaces/my-team');
    expect(routes.workspaceCreate()).toBe('/workspaces/create');
  });

  it('builds project and task addresses by key and number', () => {
    expect(routes.project('my-team', 'WEB')).toBe('/workspaces/my-team/projects/WEB');
    expect(routes.task('my-team', 'WEB', 123)).toBe('/workspaces/my-team/projects/WEB/tasks/123');
    expect(routes.projectMembers('my-team', 'WEB')).toBe(
      '/workspaces/my-team/projects/WEB/members',
    );
  });

  it('keeps account settings outside the workspace', () => {
    expect(routes.profileSettings()).toBe('/settings/profile');
    expect(routes.devicesSettings()).toBe('/settings/devices');
  });

  it('builds the invite address from the token', () => {
    expect(routes.invite('abc123')).toBe('/invite/abc123');
  });

  it('adds only the query parameters that are set', () => {
    const base = '/workspaces/my-team/projects/WEB/channels/c1';
    expect(routes.channel('my-team', 'WEB', 'c1')).toBe(base);
    expect(routes.channel('my-team', 'WEB', 'c1', { message: 'm1' })).toBe(`${base}?message=m1`);
    expect(routes.channel('my-team', 'WEB', 'c1', { thread: 't1' })).toBe(`${base}?thread=t1`);
    expect(routes.channel('my-team', 'WEB', 'c1', { message: 'm1', thread: 't1' })).toBe(
      `${base}?message=m1&thread=t1`,
    );
  });

  it('never writes "undefined" into a query string', () => {
    expect(routes.channel('my-team', 'WEB', 'c1', {})).not.toContain('undefined');
  });
});
