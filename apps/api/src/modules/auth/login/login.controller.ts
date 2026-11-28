import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  LoginRateLimitResponseSchema,
  type LoginRequest,
  LoginRequestSchema,
  type LoginResponse,
  LoginResponseSchema,
  ValidationErrorResponse,
} from '@app/contracts';
import { z } from 'zod';
import { ApiZodResponse } from '../../../core/openapi/zod-decorators.js';
import { Public } from '../decorators/public.decorator.js';
import { refreshCookieValue } from '../session/session.cookie.js';
import { LoginService } from './login.service.js';

const invalidCredentialsResponse = z.object({
  statusCode: z.literal(401),
  message: z.literal('Invalid email or password'),
  error: z.literal('Unauthorized'),
});

const loginUnavailableResponse = z.object({
  statusCode: z.literal(503),
  message: z.literal('Login is unavailable'),
  error: z.literal('Service Unavailable'),
});

@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in a user', operationId: 'Auth_login' })
  @ApiZodResponse(200, 'Access token issued', LoginResponseSchema)
  @ApiZodResponse(400, 'Invalid login fields', ValidationErrorResponse)
  @ApiZodResponse(401, 'Invalid email or password', invalidCredentialsResponse)
  @ApiZodResponse(429, 'Too many login attempts', LoginRateLimitResponseSchema)
  @ApiZodResponse(503, 'Login is unavailable', loginUnavailableResponse)
  async login(
    @Body({ schema: LoginRequestSchema }) body: LoginRequest,
    @Ip() ip: string,
    @Req() request: { headers: { 'user-agent'?: string } },
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): unknown },
  ): Promise<LoginResponse> {
    try {
      const { accessToken, refreshToken } = await this.loginService.login(
        body,
        ip,
        request.headers['user-agent'],
      );
      const secure = process.env.NODE_ENV === 'production';
      response.setHeader('Set-Cookie', refreshCookieValue(refreshToken, secure));
      return { accessToken };
    } catch (error) {
      // RFC 6585: a 429 names the wait in Retry-After, for clients that do not read the body.
      if (error instanceof HttpException && error.getStatus() === 429) {
        const limit = LoginRateLimitResponseSchema.safeParse(error.getResponse());
        if (limit.success) response.setHeader('Retry-After', String(limit.data.retryAfterSeconds));
      }
      throw error;
    }
  }
}
