import { Injectable } from '@nestjs/common';
import { ChannelsRepository } from './channels.repository.js';

@Injectable()
export class ChannelsService {
  constructor(private readonly repository: ChannelsRepository) {}

  /**
   * Channels whose events a socket receives. The prototype has no auth and no membership (one
   * placeholder author), so that is every channel. Phase 3 replaces this with the authenticated
   * user's `channel_members`.
   */
  channelIdsForSocket(): Promise<string[]> {
    return this.repository.findAllIds();
  }
}
