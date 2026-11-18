import { Module } from '@nestjs/common';
import { ChannelsRepository } from './channels.repository.js';
import { ChannelsService } from './channels.service.js';

@Module({
  providers: [ChannelsService, ChannelsRepository],
  exports: [ChannelsService],
})
export class ChannelsModule {}
