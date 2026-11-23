import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  RegisterConflictResponseSchema,
  type RegisterRequest,
  RegisterRequestSchema,
  type RegisterResponse,
  RegisterResponseSchema,
  ValidationErrorResponse,
} from '@app/contracts';
import { ApiZodResponse } from '../../../core/openapi/zod-decorators.js';
import { Public } from '../decorators/public.decorator.js';
import { RegisterService } from './register.service.js';

@Controller('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a user', operationId: 'Auth_register' })
  @ApiZodResponse(201, 'User registered', RegisterResponseSchema)
  @ApiZodResponse(400, 'Invalid registration fields', ValidationErrorResponse)
  @ApiZodResponse(409, 'Email is already in use', RegisterConflictResponseSchema)
  register(
    @Body({ schema: RegisterRequestSchema }) body: RegisterRequest,
  ): Promise<RegisterResponse> {
    return this.registerService.register(body);
  }
}
