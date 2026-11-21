import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type GetMessagesQuery,
  type GetMessagesResponse,
  MESSAGE_NEW_EVENT,
  type MessageResponse,
} from '@app/contracts';
import { RealtimePublisher } from '../../core/realtime/realtime-publisher.js';
import { channelRoom } from '../../core/realtime/rooms.js';
import { type MessageRow, MessagesRepository } from './messages.repository.js';

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
  constructor(
    private readonly repository: MessagesRepository,
    private readonly realtime: RealtimePublisher,
  ) {}

  /**
   * Saves a message, idempotently on `(authorId, clientMsgId)`. A retry returns the stored message
   * (even if its `body` differs: the stored one is canonical) and spends no channel `seq`.
   * Throws 404 for a missing channel, 409 when the key was already used in another channel.
   *
   * Then announces a fresh message to its channel room (UL-127). The repository's transaction has
   * committed by the time it resolves, so the event never describes a row a rollback undid (no
   * emit inside `$transaction`, STACK §4.3). A retry publishes nothing: the first request did.
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
    // The path keeps its letter case (ChannelMessagesParams) and Postgres returns lowercase: compare
    // lowercased.
    if (!result.created && result.row.channelId !== channelId.toLowerCase()) {
      throw new ConflictException('clientMsgId was already used in another channel');
    }
    const message = toResponse(result.row);
    if (result.created) {
      this.realtime.publish(channelRoom(message.channelId), MESSAGE_NEW_EVENT, { message });
    }
    return { message, created: result.created };
  }

  /**
   * One page of the channel's messages, oldest first (UL-130). With `afterSeq`, the first `limit`
   * after it; without, the newest `limit`. One row past the page is read to set `hasMore` (more
   * newer ones after `afterSeq`, or older ones before the newest page) without a count query.
   */
  async list(channelId: string, query: GetMessagesQuery): Promise<GetMessagesResponse> {
    if (!(await this.repository.channelExists(channelId))) {
      throw new NotFoundException('Channel not found');
    }
    const { afterSeq, limit } = query;
    const take = limit + 1;
    if (afterSeq === undefined) {
      const rows = await this.repository.findLatest(channelId, take);
      // Oldest first, so the extra row (the oldest) is the first one.
      const page = rows.length > limit ? rows.slice(1) : rows;
      return { messages: page.map(toResponse), hasMore: rows.length > limit };
    }
    const rows = await this.repository.findAfter(channelId, BigInt(afterSeq), take);
    const page = rows.length > limit ? rows.slice(0, limit) : rows;
    return { messages: page.map(toResponse), hasMore: rows.length > limit };
  }
}
