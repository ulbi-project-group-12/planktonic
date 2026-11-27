import { z } from 'zod';
import { WorkspaceRoleSchema, WorkspaceSlugParamsSchema } from './workspace.js';

export const WorkspaceMemberSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  role: WorkspaceRoleSchema,
});

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const ListWorkspaceMembersResponseSchema = z.array(WorkspaceMemberSchema);

export type ListWorkspaceMembersResponse = z.infer<typeof ListWorkspaceMembersResponseSchema>;

export const WorkspaceMemberParamsSchema = WorkspaceSlugParamsSchema.extend({
  userId: WorkspaceMemberSchema.shape.userId,
});

export type WorkspaceMemberParams = z.infer<typeof WorkspaceMemberParamsSchema>;

export const ChangeWorkspaceMemberRoleRequestSchema = z.object({
  role: WorkspaceRoleSchema.exclude(['OWNER']),
});

export type ChangeWorkspaceMemberRoleRequest = z.infer<
  typeof ChangeWorkspaceMemberRoleRequestSchema
>;
