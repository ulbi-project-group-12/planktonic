import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '../config/env.js';

const documentOptions: SwaggerDocumentOptions = {
  // `Messages_list` rather than `MessagesController_list`: Orval names hooks and types after the
  // operation id (`useMessagesList`), UL-138.
  operationIdFactory: (controllerKey, methodKey) =>
    `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
};

/** One document for Swagger UI and `pnpm openapi:export`, so the two never describe different APIs. */
export function createOpenApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('API').addBearerAuth().build(),
    documentOptions,
  );
}

/** Swagger UI at `/api/docs` (JSON at `/api/docs-json`), in development only. */
export function configureSwagger(app: INestApplication, environment: Env['NODE_ENV']): void {
  if (environment !== 'development') return;

  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app), {
    useGlobalPrefix: true,
  });
}
