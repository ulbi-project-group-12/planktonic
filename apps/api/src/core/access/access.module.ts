import { Module } from '@nestjs/common';
import { AccessGuard } from './access.guard.js';
import { AccessRepository } from './access.repository.js';
import { AccessService } from './access.service.js';

@Module({
  providers: [AccessRepository, AccessService, AccessGuard],
  exports: [AccessService, AccessGuard],
})
export class AccessModule {}
