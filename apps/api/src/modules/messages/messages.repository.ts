import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

export interface MessageRow {
  id: string;
  sec: bigint;
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
      orderBy: { sec: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  /**
   * Allocates the next channel sequence number and inserts the message in one transaction.
   * The UPDATE locks the channel row, so concurrent posts get distinct, gapless numbers (a failed
   * insert rolls the number back). `lastSeq` is nullable, hence COALESCE: `NULL + 1` is NULL.
   * Returns null when the channel does not exist.
   */
  create(channelId: string, authorId: string, body: string): Promise<MessageRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ lastSeq: bigint }[]>`
        UPDATE "channel" SET "lastSeq" = COALESCE("lastSeq", 0) + 1
        WHERE "id" = ${channelId}::uuid
        RETURNING "lastSeq"`;
      const seq = rows[0]?.lastSeq;
      if (seq === undefined) {
        return null;
      }
      return tx.message.create({ data: { channelId, authorId, body, sec: seq } });
    });
  }
}
