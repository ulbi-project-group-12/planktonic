import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mayReadEnvFile, ROOT_ENV_FILE } from './core/config/env-file.js';
import { validateEnv } from './core/config/env.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // Only the repo-root .env, resolved from the module location rather than the current
      // directory, and the same file the Prisma CLI reads (core/config/env-file.ts).
      envFilePath: ROOT_ENV_FILE,
      // Production containers and every test or verification run (NODE_ENV=test) read the
      // exported environment only: no env file is ever loaded there, so a test never picks up
      // a developer's .env.
      ignoreEnvFile: !mayReadEnvFile(),
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
