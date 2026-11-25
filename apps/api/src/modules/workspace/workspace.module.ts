import { Module } from '@nestjs/common';
import { AccessModule } from '../../core/access/access.module.js';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspaceRepository } from './workspace.repository.js';
import { WorkspaceService } from './workspace.service.js';

@Module({
  imports: [AccessModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceRepository, WorkspaceService],
})
export class WorkspaceModule {}
