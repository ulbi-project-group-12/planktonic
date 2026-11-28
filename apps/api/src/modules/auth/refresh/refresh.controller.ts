import { Controller, HttpCode, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { RefreshResponseSchema, type RefreshResponse } from '@app/contracts';
import { z } from 'zod';
import { ApiZodResponse } from '../../../core/openapi/zod-decorators.js';
import { Public } from '../decorators/public.decorator.js';
import {
  clearRefreshCookie,
  parseRefreshCookie,
  refreshCookieValue,
} from '../session/session.cookie.js';
import { RefreshService } from './refresh.service.js';

const unauthorizedResponse = z.object({
  statusCode: z.literal(401),
  message: z.literal('Unauthorized'),
  error: z.literal('Unauthorized'),
});

const unavailableResponse = z.object({
  statusCode: z.literal(503),
  message: z.literal('Refresh is unavailable'),
  error: z.literal('Service Unavailable'),
});

@Controller('auth')
export class RefreshController {
  constructor(private readonly refreshService: RefreshService) {}

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh the access token', operationId: 'Auth_refresh' })
  @ApiZodResponse(200, 'New access token issued', RefreshResponseSchema)
  @ApiZodResponse(401, 'Refresh credentials missing, expired or revoked', unauthorizedResponse)
  @ApiZodResponse(503, 'Refresh is unavailable', unavailableResponse)
  async refresh(
    @Req() request: { headers?: { cookie?: string } },
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): unknown },
  ): Promise<RefreshResponse> {
    const secure = process.env.NODE_ENV === 'production';
    try {
      const { accessToken, refreshToken } = await this.refreshService.refresh(
        parseRefreshCookie(request.headers?.cookie),
      );
      response.setHeader('Set-Cookie', refreshCookieValue(refreshToken, secure));
      return { accessToken };
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        if (status === 401 || status === 503) {
          response.setHeader('Set-Cookie', clearRefreshCookie(secure));
        }
      }
      throw error;
    }
  }
}
