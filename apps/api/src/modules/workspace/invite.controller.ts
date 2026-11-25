import { Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  type AcceptInviteResponse,
  AcceptInviteResponseSchema,
  type GetInviteResponse,
  GetInviteResponseSchema,
  HttpErrorResponse,
  type InviteTokenParams,
  InviteTokenParamsSchema,
} from '@app/contracts';
import { RequireAccess } from '../../core/access/access.decorator.js';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import type { AuthenticatedUser } from '../auth/auth.request.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { WorkspaceService } from './workspace.service.js';

@Controller('invites')
@ApiBearerAuth()
export class InviteController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'Preview a workspace invitation', operationId: 'Invite_get' })
  @ApiZodResponse(200, 'Invitation details', GetInviteResponseSchema)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(404, 'Invite not found', HttpErrorResponse)
  get(
    @Param({ schema: InviteTokenParamsSchema }) { token }: InviteTokenParams,
  ): Promise<GetInviteResponse> {
    return this.workspaceService.getInvite(token);
  }

  @Post(':token/accept')
  @HttpCode(200)
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'Accept a workspace invitation', operationId: 'Invite_accept' })
  @ApiZodResponse(200, 'Workspace to open', AcceptInviteResponseSchema)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  @ApiZodResponse(403, 'Invitation acceptance forbidden', HttpErrorResponse)
  @ApiZodResponse(410, 'Invite is no longer valid', HttpErrorResponse)
  accept(
    @Param({ schema: InviteTokenParamsSchema }) { token }: InviteTokenParams,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AcceptInviteResponse> {
    return this.workspaceService.acceptInvite(token, user.id);
  }
}
