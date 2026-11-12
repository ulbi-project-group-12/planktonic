// NestJS 12 (ESM) entry point of @app/api. The product name is never spelled here (D-07):
// it reaches the process only through PRODUCT_NAME.
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './core/config/env.js';

async function bootstrap(): Promise<void> {
  // abortOnError: false makes a startup failure (an invalid environment included) reject here
  // instead of Nest calling process.exit, so the catch below sets the exit code.
  const app = configureApp(await NestFactory.create(AppModule, { abortOnError: false }));
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('API_PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Listening on ${await app.getUrl()}/api`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  console.error(`api failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
