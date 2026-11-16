import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

export interface MessageRow {
  id: string;
  seq: bigint;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/** The only place that talks to the database for messages (STACK §3.1). */
@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async channelExists(channelId: string): Promise<boolean> {
    const count = await this.prisma.channel.count({ where: { id: channelId } });
    return count > 0;
  }

  /** Newest `limit` messages of the channel, oldest first. */
  async findLatest(channelId: string, limit: number): Promise<MessageRow[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: { seq: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  /**
   * Allocates the next channel sequence number and inserts the message in one transaction.
   * The UPDATE locks the channel row, so concurrent posts get distinct, gapless numbers (a failed
   * insert rolls the number back). `last_seq` is NOT NULL DEFAULT 0, so the first message gets 1.
   * Returns null when the channel does not exist.
   */
  create(channelId: string, authorId: string, body: string): Promise<MessageRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ last_seq: bigint }[]>`
        UPDATE channels SET last_seq = last_seq + 1
        WHERE id = ${channelId}::uuid
        RETURNING last_seq`;
      const seq = rows[0]?.last_seq;
      if (seq === undefined) {
        return null;
      }
      return tx.message.create({ data: { channelId, authorId, body, seq } });
    });
  }
}
