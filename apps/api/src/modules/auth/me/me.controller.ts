import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { type MeResponse, MeResponseSchema } from '@app/contracts';
import { z } from 'zod';
import { RequireAccess } from '../../../core/access/access.decorator.js';
import { ApiZodResponse } from '../../../core/openapi/zod-decorators.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';

const unauthorizedResponse = z.object({
  statusCode: z.literal(401),
  message: z.literal('Unauthorized'),
});

@Controller('auth')
export class MeController {
  @Get('me')
  @RequireAccess({ kind: 'authenticated' })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user', operationId: 'Auth_me' })
  @ApiZodResponse(200, 'Current user profile', MeResponseSchema)
  @ApiZodResponse(401, 'Authentication required', unauthorizedResponse)
  me(@CurrentUser() user: MeResponse): MeResponse {
    return user;
  }
}
