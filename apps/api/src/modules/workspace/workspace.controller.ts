import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  type ChangeWorkspaceMemberRoleRequest,
  ChangeWorkspaceMemberRoleRequestSchema,
  type CreateInviteRequest,
  CreateInviteRequestSchema,
  type CreateInviteResponse,
  CreateInviteResponseSchema,
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  HttpErrorResponse,
  type ListWorkspaceMembersResponse,
  ListWorkspaceMembersResponseSchema,
  type ListWorkspacesResponse,
  ListWorkspacesResponseSchema,
  ValidationErrorResponse,
  type WorkspaceDetailsResponse,
  WorkspaceDetailsResponseSchema,
  type WorkspaceMember,
  type WorkspaceMemberParams,
  WorkspaceMemberParamsSchema,
  WorkspaceMemberSchema,
  type WorkspaceResponse,
  WorkspaceResponseSchema,
  WorkspaceSlugConflictResponseSchema,
  type WorkspaceSlugParams,
  WorkspaceSlugParamsSchema,
} from '@app/contracts';
import { RequireAccess } from '../../core/access/access.decorator.js';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import type { AuthenticatedUser } from '../auth/auth.request.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { WorkspaceService } from './workspace.service.js';

@Controller('workspaces')
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'List the current user’s workspaces', operationId: 'Workspace_list' })
  @ApiZodResponse(200, 'Workspaces', ListWorkspacesResponseSchema)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListWorkspacesResponse> {
    return this.workspaceService.listForUser(user.id);
  }

  @Get(':slug')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'Get a workspace by slug', operationId: 'Workspace_getBySlug' })
  @ApiZodResponse(200, 'Workspace', WorkspaceDetailsResponseSchema)
  @ApiZodResponse(400, 'Invalid workspace slug', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(404, 'Workspace not found', HttpErrorResponse)
  getBySlug(
    @Param({ schema: WorkspaceSlugParamsSchema }) { slug }: WorkspaceSlugParams,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceDetailsResponse> {
    return this.workspaceService.getBySlugForUser(slug, user.id);
  }

  @Get(':slug/members')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'List workspace members', operationId: 'Workspace_listMembers' })
  @ApiZodResponse(200, 'Workspace members', ListWorkspaceMembersResponseSchema)
  @ApiZodResponse(400, 'Invalid workspace slug', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(404, 'Workspace not found', HttpErrorResponse)
  listMembers(
    @Param({ schema: WorkspaceSlugParamsSchema }) { slug }: WorkspaceSlugParams,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListWorkspaceMembersResponse> {
    return this.workspaceService.listMembers(slug, user.id);
  }

  @Patch(':slug/members/:userId/role')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({
    summary: 'Change a workspace member role',
    operationId: 'Workspace_changeMemberRole',
  })
  @ApiZodResponse(200, 'Updated member', WorkspaceMemberSchema)
  @ApiZodResponse(400, 'Invalid workspace slug, user ID or role', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(403, 'Role change forbidden', HttpErrorResponse)
  @ApiZodResponse(404, 'Workspace or member not found', HttpErrorResponse)
  @ApiZodResponse(409, 'Member role changed concurrently', HttpErrorResponse)
  changeMemberRole(
    @Param({ schema: WorkspaceMemberParamsSchema }) { slug, userId }: WorkspaceMemberParams,
    @Body({ schema: ChangeWorkspaceMemberRoleRequestSchema })
    { role }: ChangeWorkspaceMemberRoleRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.changeMemberRole(slug, user.id, userId, role);
  }

  @Post(':slug/invites')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'Create a workspace invitation', operationId: 'Invite_create' })
  @ApiZodResponse(201, 'Invitation created', CreateInviteResponseSchema)
  @ApiZodResponse(400, 'Invalid workspace slug or invitation role', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(403, 'Invitation creation forbidden', HttpErrorResponse)
  @ApiZodResponse(404, 'Workspace not found', HttpErrorResponse)
  createInvite(
    @Param({ schema: WorkspaceSlugParamsSchema }) { slug }: WorkspaceSlugParams,
    @Body({ schema: CreateInviteRequestSchema }) { role }: CreateInviteRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateInviteResponse> {
    return this.workspaceService.createInvite(slug, user.id, role);
  }

  @Post()
  @RequireAccess({ kind: 'permission', permission: 'workspace.create' })
  @ApiZodResponse(403, 'Workspace creation forbidden', HttpErrorResponse)
  @ApiOperation({ summary: 'Create a workspace', operationId: 'Workspace_create' })
  @ApiZodResponse(201, 'Workspace created', WorkspaceResponseSchema)
  @ApiZodResponse(400, 'Invalid workspace fields', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(409, 'Workspace slug is already in use', WorkspaceSlugConflictResponseSchema)
  create(
    @Body({ schema: CreateWorkspaceRequestSchema }) body: CreateWorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceResponse> {
    return this.workspaceService.create(body, user.id);
  }
}
