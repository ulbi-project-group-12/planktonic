import { Injectable, NotFoundException } from '@nestjs/common';
import type { GetMessagesResponse, MessageResponse } from '@app/contracts';
import { type MessageRow, MessagesRepository } from './messages.repository.js';

/** How many of the newest messages GET returns (no pagination yet). */
export const MESSAGES_PAGE_SIZE = 100;

function toResponse(row: MessageRow): MessageResponse {
  return {
    id: row.id,
    seq: row.seq.toString(),
    channelId: row.channelId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class MessagesService {
  constructor(private readonly repository: MessagesRepository) {}

  async create(channelId: string, authorId: string, body: string): Promise<MessageResponse> {
    const row = await this.repository.create(channelId, authorId, body);
    if (row === null) {
      throw new NotFoundException('Channel not found');
    }
    return toResponse(row);
  }

  async list(channelId: string): Promise<GetMessagesResponse> {
    if (!(await this.repository.channelExists(channelId))) {
      throw new NotFoundException('Channel not found');
    }
    const rows = await this.repository.findLatest(channelId, MESSAGES_PAGE_SIZE);
    return { messages: rows.map(toResponse) };
  }
}
