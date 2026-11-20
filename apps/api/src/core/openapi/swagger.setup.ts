import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '../config/env.js';

export function createOpenApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('API').build());
}

export function configureSwagger(app: INestApplication, environment: Env['NODE_ENV']): void {
  if (environment !== 'development') return;

  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app), {
    useGlobalPrefix: true,
  });
}
