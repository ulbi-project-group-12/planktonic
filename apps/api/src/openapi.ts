import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { API_PREFIX } from './app.setup.js';
import { createOpenApiDocument } from './core/openapi/swagger.setup.js';

/**
 * The OpenAPI document of the whole AppModule, so every route a module adds is in it without a list
 * to keep up to date. Needs no database or Redis: `NestFactory.create()` runs no `onModuleInit`, so
 * nothing connects, and the Redis adapter is wired only in `configureRealtime()`. The environment
 * still has to pass `validateEnv` (see `openapi-export.ts`).
 */
export async function exportOpenApi(outputPath: string): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false, logger: false });
  try {
    app.setGlobalPrefix(API_PREFIX);
    const document = createOpenApiDocument(app);
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  } finally {
    await app.close();
  }
}
