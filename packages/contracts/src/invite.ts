import { z } from 'zod';
import { WorkspaceRoleSchema, WorkspaceSlug } from './workspace.js';

export const InviteRoleSchema = WorkspaceRoleSchema.exclude(['OWNER']);

export type InviteRole = z.infer<typeof InviteRoleSchema>;

const InviteTokenSchema = z.string().min(1);

export const InviteTokenParamsSchema = z.object({ token: InviteTokenSchema });

export type InviteTokenParams = z.infer<typeof InviteTokenParamsSchema>;

export const CreateInviteRequestSchema = z.object({ role: InviteRoleSchema });

export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;

export const CreateInviteResponseSchema = CreateInviteRequestSchema.extend({
  token: InviteTokenSchema,
});

export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;

export const GetInviteResponseSchema = z.object({
  workspaceName: z.string(),
  workspaceSlug: WorkspaceSlug,
  role: InviteRoleSchema,
});

export type GetInviteResponse = z.infer<typeof GetInviteResponseSchema>;

export const AcceptInviteResponseSchema = GetInviteResponseSchema.pick({ workspaceSlug: true });

export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>;
