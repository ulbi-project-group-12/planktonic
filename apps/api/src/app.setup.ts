import type { INestApplication } from '@nestjs/common';

/** App-wide HTTP setup, shared by main.ts and the e2e tests so both serve the same routes. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
