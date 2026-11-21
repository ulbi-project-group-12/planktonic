import { ApiResponse } from '@nestjs/swagger';
import type { z } from 'zod';

/**
 * Documents one response of a route with a schema from `@app/contracts`.
 *
 * `@nestjs/swagger` converts the schema itself: zod 4 exposes `~standard.jsonSchema`, Nest asks it
 * for the `openapi-3.0` target (`output` for responses) and moves `.meta({ id })` schemas into
 * `components.schemas`. Request bodies, queries and params need no decorator: `@Body({ schema })`,
 * `@Query({ schema })` and `@Param(..., { schema })` are documented from the schema the global pipe
 * validates against.
 */
export function ApiZodResponse(
  status: number,
  description: string,
  schema: z.ZodType,
): MethodDecorator & ClassDecorator {
  return ApiResponse({ status, description, standardSchema: schema });
}
