import {
  OpenApiExampleBody,
  OpenApiExampleResponse,
  ValidationErrorResponse,
} from '@app/contracts';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiZodBody, ApiZodResponse } from '../../core/openapi/zod-decorators.js';

@Controller('openapi-example')
export class OpenApiExampleController {
  @Post()
  @ApiZodBody(OpenApiExampleBody)
  @ApiZodResponse(201, 'Greeting created', OpenApiExampleResponse)
  @ApiZodResponse(400, 'Validation failed', ValidationErrorResponse)
  create(@Body({ schema: OpenApiExampleBody }) body: OpenApiExampleBody): OpenApiExampleResponse {
    return { greeting: `Hello, ${body.name}!` };
  }
}
