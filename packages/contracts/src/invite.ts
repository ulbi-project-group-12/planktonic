import { z } from 'zod';
import { HttpErrorResponse } from './errors.js';
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

export const AcceptInviteOutcomeSchema = AcceptInviteResponseSchema.extend({
  outcome: z.enum(['joined', 'already_member']),
});

export type AcceptInviteOutcome = z.infer<typeof AcceptInviteOutcomeSchema>;

export const InviteNotFoundResponseSchema = HttpErrorResponse.extend({
  statusCode: z.literal(404),
  code: z.literal('invite_not_found'),
});

export type InviteNotFoundResponse = z.infer<typeof InviteNotFoundResponseSchema>;

export const InviteGoneResponseSchema = HttpErrorResponse.extend({
  statusCode: z.literal(410),
  code: z.enum(['invite_expired', 'invite_consumed', 'invite_revoked']),
});

export type InviteGoneResponse = z.infer<typeof InviteGoneResponseSchema>;
