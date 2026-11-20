import { writeFile } from 'node:fs/promises';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX } from '../../app.setup.js';
import { HealthController } from '../../modules/health/health.controller.js';
import { HealthService } from '../../modules/health/health.service.js';
import { OpenApiExampleModule } from '../../modules/openapi-example/openapi-example.module.js';
import { createOpenApiDocument } from './swagger.setup.js';

@Module({
  imports: [OpenApiExampleModule],
  controllers: [HealthController],
  providers: [{ provide: HealthService, useValue: {} }],
})
class OpenApiExportModule {}

export async function exportOpenApi(outputPath: string): Promise<void> {
  const app = await NestFactory.create(OpenApiExportModule, { abortOnError: false, logger: false });
  try {
    app.setGlobalPrefix(API_PREFIX);
    const document = createOpenApiDocument(app);
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  } finally {
    await app.close();
  }
}
