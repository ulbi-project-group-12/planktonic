import {
  BadRequestException,
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

export const API_PREFIX = 'api';

type ValidationIssue = Parameters<
  NonNullable<ConstructorParameters<typeof StandardSchemaValidationPipe>[0]>['exceptionFactory'] &
    object
>[0][number];

/** 400 body: `{ message, issues: [{ path, message }] }`, `path` being dot-joined (`body`, `a.0.b`). */
function validationException(issues: readonly ValidationIssue[]): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message: 'Validation failed',
    issues: issues.map((issue) => ({
      path: (issue.path ?? [])
        .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.'),
      message: issue.message,
    })),
  });
}

/** App-wide HTTP setup, shared by main.ts and the e2e tests so both serve the same routes. */
export function configureApp(app: INestApplication, behindTraefik = false): INestApplication {
  // Don't advertise the framework (Express sets X-Powered-By by default).
  const server = app.getHttpAdapter().getInstance() as {
    disable(setting: string): unknown;
    set(setting: string, value: number): unknown;
  };
  server.disable('x-powered-by');
  if (behindTraefik) server.set('trust proxy', 1);
  app.setGlobalPrefix(API_PREFIX);
  // Validates every `@Body({ schema })` / `@Param(..., { schema })` against its zod schema (zod 4
  // implements Standard Schema); parameters without a schema pass through untouched.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: validationException }));
  app.enableShutdownHooks();
  return app;
}
