// NestJS 12 (ESM) entry point of @app/api. The product name is never spelled here (D-07): code
// that needs it imports @app/config/product. The image exports PRODUCT_NAME, but no code reads it.

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './core/config/env.js';
import { configureSwagger } from './core/openapi/swagger.setup.js';
import { configureRealtime } from './core/realtime/realtime.setup.js';

async function bootstrap(): Promise<void> {
  // abortOnError: false makes a startup failure (an invalid environment included) reject here
  // instead of Nest calling process.exit, so the catch below sets the exit code.
  const app = await NestFactory.create(AppModule, { abortOnError: false });

  try {
    const config = app.get<ConfigService<Env, true>>(ConfigService);

    configureApp(app, config.get('API_BEHIND_TRAEFIK', { infer: true }) === 'true');

    // Before listen(): the Socket.IO server is created with the Redis Streams adapter in place.
    await configureRealtime(app);

    configureSwagger(app, config.get('NODE_ENV', { infer: true }));

    await app.listen(
      config.get('API_PORT', { infer: true }),
      config.get('API_HOST', { infer: true }),
    );

    Logger.log(`Listening on ${await app.getUrl()}/api`, 'Bootstrap');
  } catch (error) {
    try {
      await app.close();
    } catch (closeError) {
      Logger.error(
        'Failed to close application after startup error',
        closeError instanceof Error ? closeError.stack : String(closeError),
        'Bootstrap',
      );
    }

    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    `API failed to start: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
    'Bootstrap',
  );

  process.exitCode = 1;
});
