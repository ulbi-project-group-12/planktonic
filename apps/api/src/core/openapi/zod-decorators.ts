import { ApiBody, ApiResponse, type ApiResponseSchemaHost } from '@nestjs/swagger';
import { z } from 'zod';

function toOpenApiSchema(schema: z.ZodType, io: 'input' | 'output') {
  const jsonSchema = z.toJSONSchema(schema, { target: 'openapi-3.0', io });
  delete jsonSchema.$schema;
  return jsonSchema as ApiResponseSchemaHost['schema'];
}

export function ApiZodBody(schema: z.ZodType): MethodDecorator {
  return ApiBody({ required: true, schema: toOpenApiSchema(schema, 'input') });
}

export function ApiZodResponse(
  status: number,
  description: string,
  schema: z.ZodType,
): MethodDecorator {
  return ApiResponse({ status, description, schema: toOpenApiSchema(schema, 'output') });
}
