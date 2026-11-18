import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    clientMsgId: row.clientMsgId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Result of `MessagesService.create` (UL-126). Stable shape: UL-127 reads `created` to emit
 * `message:new` only for a fresh insert, never for a retry.
 *
 * - `message`: the canonical stored message; identical for the first request and every retry.
 * - `created`: `true` when this call inserted the row, `false` when a retry with the same
 *   `(authorId, clientMsgId)` found the row an earlier request had already committed.
 */
export interface CreateMessageResult {
  message: MessageResponse;
  created: boolean;
}

@Injectable()
export class MessagesService {
  constructor(private readonly repository: MessagesRepository) {}

  /**
   * Saves a message, idempotently on `(authorId, clientMsgId)`. A retry returns the stored message
   * (even if its `body` differs: the stored one is canonical) and spends no channel `seq`.
   * Throws 404 for a missing channel, 409 when the key was already used in another channel.
   */
  async create(
    channelId: string,
    authorId: string,
    clientMsgId: string,
    body: string,
  ): Promise<CreateMessageResult> {
    const result = await this.repository.create(channelId, authorId, clientMsgId, body);
    if (result === null) {
      throw new NotFoundException('Channel not found');
    }
    // A key is per message, so a "retry" into another channel is a client bug, not a retry.
    if (!result.created && result.row.channelId !== channelId) {
      throw new ConflictException('clientMsgId was already used in another channel');
    }
    return { message: toResponse(result.row), created: result.created };
  }

  async list(channelId: string): Promise<GetMessagesResponse> {
    if (!(await this.repository.channelExists(channelId))) {
      throw new NotFoundException('Channel not found');
    }
    const rows = await this.repository.findLatest(channelId, MESSAGES_PAGE_SIZE);
    return { messages: rows.map(toResponse) };
  }
}
