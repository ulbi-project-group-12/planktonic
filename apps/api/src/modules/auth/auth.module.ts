import { Module } from '@nestjs/common';
import { RegisterController } from './register/register.controller.js';
import { RegisterRepository } from './register/register.repository.js';
import { RegisterService } from './register/register.service.js';

@Module({
  controllers: [RegisterController],
  providers: [RegisterService, RegisterRepository],
})
export class AuthModule {}
