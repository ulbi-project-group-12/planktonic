import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateWorkspaceRequest,
  type ListWorkspacesResponse,
  ListWorkspacesResponseSchema,
  type WorkspaceResponse,
  WorkspaceResponseSchema,
  type WorkspaceSlugConflictResponse,
} from '@app/contracts';
import { WorkspaceRepository } from './workspace.repository.js';

@Injectable()
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async listForUser(userId: string): Promise<ListWorkspacesResponse> {
    const workspaces = await this.repository.findAllForUser(userId);
    return ListWorkspacesResponseSchema.parse(workspaces);
  }

  async getBySlugForUser(slug: string, userId: string): Promise<WorkspaceResponse> {
    const workspace = await this.repository.findBySlugForUser(slug, userId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return WorkspaceResponseSchema.parse(workspace);
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
}
