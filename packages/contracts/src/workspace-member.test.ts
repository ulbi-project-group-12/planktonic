import { expect, it } from 'vitest';
import {
  ChangeWorkspaceMemberRoleRequestSchema,
  ListWorkspaceMembersResponseSchema,
  WorkspaceMemberParamsSchema,
} from './workspace-member.js';

const userId = '019a8f00-0000-7000-8000-000000000004';

it('includes owners in the list and excludes OWNER from role changes', () => {
  const members = [{ userId, name: 'Ada', role: 'OWNER' }];
  expect(ListWorkspaceMembersResponseSchema.parse(members)).toEqual(members);
  expect(ChangeWorkspaceMemberRoleRequestSchema.safeParse({ role: 'OWNER' }).success).toBe(false);
});

it.each(['MEMBER', 'ADMIN'])('accepts %s as a requested role', (role) => {
  expect(ChangeWorkspaceMemberRoleRequestSchema.parse({ role })).toEqual({ role });
});

it('identifies the target member by workspace slug and user UUID', () => {
  const params = { slug: 'my-team', userId };
  expect(WorkspaceMemberParamsSchema.parse(params)).toEqual(params);
  expect(WorkspaceMemberParamsSchema.safeParse({ ...params, userId: 'ada' }).success).toBe(false);
});
