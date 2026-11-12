import type { INestApplication } from '@nestjs/common';

/** App-wide HTTP setup, shared by main.ts and the e2e tests so both serve the same routes. */
export function configureApp(app: INestApplication): INestApplication {
  // Don't advertise the framework (Express sets X-Powered-By by default).
  const server = app.getHttpAdapter().getInstance() as { disable(setting: string): unknown };
  server.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
