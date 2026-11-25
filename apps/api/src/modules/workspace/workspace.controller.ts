import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  HttpErrorResponse,
  type ListWorkspacesResponse,
  ListWorkspacesResponseSchema,
  ValidationErrorResponse,
  type WorkspaceResponse,
  WorkspaceResponseSchema,
  WorkspaceSlugConflictResponseSchema,
  type WorkspaceSlugParams,
  WorkspaceSlugParamsSchema,
} from '@app/contracts';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import type { AuthenticatedUser } from '../auth/auth.request.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { WorkspaceService } from './workspace.service.js';

@Controller('workspaces')
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
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
  @ApiOperation({ summary: 'Get a workspace by slug', operationId: 'Workspace_getBySlug' })
  @ApiZodResponse(200, 'Workspace', WorkspaceResponseSchema)
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
  ): Promise<WorkspaceResponse> {
    return this.workspaceService.getBySlugForUser(slug, user.id);
  }

  @Post()
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
