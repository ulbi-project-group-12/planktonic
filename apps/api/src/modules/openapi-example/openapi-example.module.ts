import { Module } from '@nestjs/common';
import { OpenApiExampleController } from './openapi-example.controller.js';

@Module({ controllers: [OpenApiExampleController] })
export class OpenApiExampleModule {}
