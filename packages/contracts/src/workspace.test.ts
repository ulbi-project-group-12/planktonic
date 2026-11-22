import { describe, expect, it } from 'vitest';
import { WorkspaceSlug } from './workspace.js';

describe('WorkspaceSlug', () => {
  it.each(['my-team', 'a', 'ulbi-group-12', 'x1'])('accepts %s', (slug) => {
    expect(WorkspaceSlug.safeParse(slug).success).toBe(true);
  });

  it.each([
    ['uppercase', 'My-Team'],
    ['leading hyphen', '-team'],
    ['trailing hyphen', 'team-'],
    ['underscore', 'my_team'],
    ['empty', ''],
    ['too long', 'a'.repeat(41)],
    ['reserved create', 'create'],
  ])('rejects %s', (_, slug) => {
    expect(WorkspaceSlug.safeParse(slug).success).toBe(false);
  });

  it('accepts a 40-character slug', () => {
    expect(WorkspaceSlug.safeParse('a'.repeat(40)).success).toBe(true);
  });
});
