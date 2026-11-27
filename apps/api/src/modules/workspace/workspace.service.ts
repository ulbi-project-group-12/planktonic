import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AcceptInviteOutcome,
  AcceptInviteOutcomeSchema,
  type ChangeWorkspaceMemberRoleRequest,
  type CreateInviteResponse,
  type CreateWorkspaceRequest,
  type GetInviteResponse,
  GetInviteResponseSchema,
  type InviteRole,
  type ListWorkspaceMembersResponse,
  ListWorkspaceMembersResponseSchema,
  type ListWorkspacesResponse,
  ListWorkspacesResponseSchema,
  type WorkspaceDetailsResponse,
  WorkspaceDetailsResponseSchema,
  type WorkspaceMember,
  WorkspaceMemberSchema,
  type WorkspaceResponse,
  WorkspaceResponseSchema,
  type WorkspaceSlugConflictResponse,
} from '@app/contracts';
import { AccessService } from '../../core/access/access.service.js';
import { requireActiveInvite } from './invite-status.js';
import { WorkspaceRepository } from './workspace.repository.js';

const INVITE_TTL_MS = 24 * 60 * 60 * 1_000;

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly access: AccessService,
  ) {}

  async listForUser(userId: string): Promise<ListWorkspacesResponse> {
    const workspaces = await this.repository.findAllForUser(userId);
    return ListWorkspacesResponseSchema.parse(workspaces);
  }

  async getBySlugForUser(slug: string, userId: string): Promise<WorkspaceDetailsResponse> {
    const workspace = await this.repository.findBySlug(slug);
    if (
      !workspace ||
      !(await this.access.can({ id: userId }, 'workspace.read', { workspaceId: workspace.id }))
    ) {
      throw new NotFoundException('Workspace not found');
    }
    const role = await this.access.getWorkspaceRole({ id: userId }, workspace.id);
    if (!role) throw new NotFoundException('Workspace not found');
    return WorkspaceDetailsResponseSchema.parse({ ...workspace, role });
  }

  async create(input: CreateWorkspaceRequest, userId: string): Promise<WorkspaceResponse> {
    const workspace = await this.repository.createWithOwner(input, userId);
    if (!workspace) {
      const response: WorkspaceSlugConflictResponse = {
        statusCode: 409,
        message: 'Workspace slug is already in use',
        error: 'Conflict',
        issues: [{ path: 'slug', message: 'This slug is already taken' }],
      };
      throw new ConflictException(response);
    }
    return WorkspaceResponseSchema.parse(workspace);
  }

  async listMembers(slug: string, userId: string): Promise<ListWorkspaceMembersResponse> {
    const workspace = await this.repository.findBySlug(slug);
    if (
      !workspace ||
      !(await this.access.can({ id: userId }, 'workspace.member.list', {
        workspaceId: workspace.id,
      }))
    ) {
      throw new NotFoundException('Workspace not found');
    }

    const members = await this.repository.listMembers(workspace.id);
    return ListWorkspaceMembersResponseSchema.parse(
      members.map(({ userId, role, user }) => ({ userId, role, name: user.name })),
    );
  }

  async changeMemberRole(
    slug: string,
    actorId: string,
    targetUserId: string,
    newRole: ChangeWorkspaceMemberRoleRequest['role'],
  ): Promise<WorkspaceMember> {
    const workspace = await this.repository.findBySlug(slug);
    const actor = { id: actorId };
    if (
      !workspace ||
      !(await this.access.can(actor, 'workspace.read', { workspaceId: workspace.id }))
    ) {
      throw new NotFoundException('Workspace not found');
    }

    const workspaceId = workspace.id;
    const targetRole = await this.access.getWorkspaceRole({ id: targetUserId }, workspaceId);
    if (!targetRole) throw new NotFoundException('Workspace member not found');
    if (
      !(await this.access.can(actor, 'workspace.member.role.change', {
        workspaceId,
        targetRole,
        newRole,
      }))
    ) {
      throw new ForbiddenException('Role change forbidden');
    }

    const updated = await this.repository.changeMemberRole(
      workspaceId,
      targetUserId,
      targetRole,
      newRole,
    );
    if (!updated) throw new ConflictException('Workspace member changed concurrently');
    return WorkspaceMemberSchema.parse({
      userId: updated.userId,
      name: updated.user.name,
      role: updated.role,
    });
  }

  async createInvite(
    slug: string,
    userId: string,
    role: InviteRole,
  ): Promise<CreateInviteResponse> {
    const workspace = await this.repository.findBySlug(slug);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const user = { id: userId };
    const scope = { workspaceId: workspace.id, targetRole: role };
    if (!(await this.access.can(user, 'workspace.invite.create', scope))) {
      if (!(await this.access.can(user, 'workspace.read', scope))) {
        throw new NotFoundException('Workspace not found');
      }
      throw new ForbiddenException('Invitation creation forbidden');
    }

    const token = randomBytes(32).toString('base64url');
    await this.repository.createInvite({
      workspaceId: workspace.id,
      createdById: userId,
      role,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });
    return { token, role };
  }

  async getInvite(token: string): Promise<GetInviteResponse> {
    const invite = requireActiveInvite(await this.repository.findInvite(hashInviteToken(token)));

    return GetInviteResponseSchema.parse({
      workspaceName: invite.workspace.name,
      workspaceSlug: invite.workspace.slug,
      role: invite.role,
    });
  }

  async acceptInvite(token: string, userId: string): Promise<AcceptInviteOutcome> {
    const tokenHash = hashInviteToken(token);
    requireActiveInvite(await this.repository.findInvite(tokenHash));
    const allowed = await this.access.can({ id: userId }, 'workspace.invite.accept', {
      invitation: { valid: true, email: null },
    });
    if (!allowed) throw new ForbiddenException('Invitation acceptance forbidden');

    return AcceptInviteOutcomeSchema.parse(await this.repository.acceptInvite(tokenHash, userId));
  }
}
