import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './core/config/env.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // `pnpm dev` runs from apps/api, so the repo-root .env is ../../.env.
      envFilePath: ['.env', '../../.env'],
      // Production containers and every test or verification run (NODE_ENV=test) read the
      // exported environment only: no env file is ever loaded there, so a test never picks up
      // a developer's .env.
      ignoreEnvFile: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
