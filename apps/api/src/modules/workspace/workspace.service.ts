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
  type CreateInviteResponse,
  type CreateProjectRequest,
  type CreateWorkspaceRequest,
  type GetInviteResponse,
  GetInviteResponseSchema,
  type InviteRole,
  type ListWorkspacesResponse,
  ListWorkspacesResponseSchema,
  type ListProjectsResponse,
  ListProjectsResponseSchema,
  type ProjectKeyConflictResponse,
  type ProjectResponse,
  ProjectResponseSchema,
  type WorkspaceDetailsResponse,
  WorkspaceDetailsResponseSchema,
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
    const canCreateProject = await this.access.can({ id: userId }, 'project.create', {
      workspaceId: workspace.id,
    });
    return WorkspaceDetailsResponseSchema.parse({ ...workspace, role, canCreateProject });
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

  async listProjects(slug: string, userId: string): Promise<ListProjectsResponse> {
    const workspace = await this.repository.findBySlug(slug);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const scope = await this.access.projectReadScope({ id: userId }, workspace.id);
    if (!scope) throw new NotFoundException('Workspace not found');
    const projects = await this.repository.listProjects(
      workspace.id,
      scope === 'member' ? userId : undefined,
    );
    return ListProjectsResponseSchema.parse(projects);
  }

  async getProject(slug: string, key: string, userId: string): Promise<ProjectResponse> {
    const workspace = await this.repository.findBySlug(slug);
    const project = workspace && (await this.repository.findProjectByKey(workspace.id, key));
    if (
      !workspace ||
      !project ||
      !(await this.access.can({ id: userId }, 'project.read', {
        workspaceId: workspace.id,
        projectId: project.id,
      }))
    ) {
      throw new NotFoundException('Project not found');
    }
    return ProjectResponseSchema.parse(project);
  }

  async createProject(
    slug: string,
    input: CreateProjectRequest,
    userId: string,
  ): Promise<ProjectResponse> {
    const workspace = await this.repository.findBySlug(slug);
    const user = { id: userId };
    if (
      !workspace ||
      !(await this.access.can(user, 'workspace.read', { workspaceId: workspace.id }))
    ) {
      throw new NotFoundException('Workspace not found');
    }
    if (!(await this.access.can(user, 'project.create', { workspaceId: workspace.id }))) {
      throw new ForbiddenException('Project creation forbidden');
    }

    const project = await this.repository.createProjectWithAdmin(workspace.id, input, userId);
    if (!project) {
      const response: ProjectKeyConflictResponse = {
        statusCode: 409,
        message: 'Project key is already in use',
        error: 'Conflict',
        issues: [{ path: 'key', message: 'This key is already taken' }],
      };
      throw new ConflictException(response);
    }
    return ProjectResponseSchema.parse(project);
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
