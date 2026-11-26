import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  HttpErrorResponse,
  type MeResponse,
  MeResponseSchema,
  type UpdateMeRequest,
  UpdateMeRequestSchema,
  ValidationErrorResponse,
} from '@app/contracts';
import { RequireAccess } from '../../core/access/access.decorator.js';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import type { AuthenticatedUser } from '../auth/auth.request.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @RequireAccess({ kind: 'authenticated' })
  @ApiOperation({ summary: 'Update the current user profile', operationId: 'Users_updateMe' })
  @ApiZodResponse(200, 'Updated profile', MeResponseSchema)
  @ApiZodResponse(400, 'Invalid profile fields', ValidationErrorResponse)
  @ApiZodResponse(
    401,
    'Authentication required',
    HttpErrorResponse.pick({ statusCode: true, message: true }),
  )
  updateMe(
    @Body({ schema: UpdateMeRequestSchema }) body: UpdateMeRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MeResponse> {
    return this.usersService.updateMe(user.id, body);
  }
}
