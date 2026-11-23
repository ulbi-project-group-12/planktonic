import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  type LoginRequest,
  LoginRequestSchema,
  type LoginResponse,
  LoginResponseSchema,
  ValidationErrorResponse,
} from '@app/contracts';
import { z } from 'zod';
import { ApiZodResponse } from '../../../core/openapi/zod-decorators.js';
import { Public } from '../decorators/public.decorator.js';
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
  @ApiZodResponse(503, 'Login is unavailable', loginUnavailableResponse)
  login(@Body({ schema: LoginRequestSchema }) body: LoginRequest): Promise<LoginResponse> {
    return this.loginService.login(body);
  }
}
