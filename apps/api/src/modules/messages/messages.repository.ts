import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';

export interface MessageRow {
  id: string;
  seq: bigint;
  channelId: string;
  authorId: string;
  clientMsgId: string;
  body: string;
  createdAt: Date;
}

/**
 * Outcome of an idempotent insert (UL-126). `created` is true only for the call that inserted the
 * row; a retry with the same `(authorId, clientMsgId)` gets the stored row and `created: false`.
 */
export interface CreateMessageRowResult {
  row: MessageRow;
  created: boolean;
}

/** Prisma's error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

/** The only place that talks to the database for messages (STACK §3.1). */
@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async channelExists(channelId: string): Promise<boolean> {
    const count = await this.prisma.channel.count({ where: { id: channelId } });
    return count > 0;
  }

  /**
   * Newest `take` messages of the channel, oldest first. The caller asks for one more row than it
   * returns to learn whether older ones exist without a second query.
   */
  async findLatest(channelId: string, take: number): Promise<MessageRow[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: { seq: 'desc' },
      take,
    });
    return rows.reverse();
  }

  /**
   * The first `take` messages of the channel with `seq > afterSeq`, oldest first (the reconnect
   * catch-up, UL-130). Served by the `(channel_id, seq)` unique index.
   */
  findAfter(channelId: string, afterSeq: bigint, take: number): Promise<MessageRow[]> {
    return this.prisma.message.findMany({
      where: { channelId, seq: { gt: afterSeq } },
      orderBy: { seq: 'asc' },
      take,
    });
  }

  /**
   * Allocates the next channel sequence number and inserts the message in one transaction.
   * The UPDATE locks the channel row, so concurrent posts get distinct, gapless numbers (a failed
   * insert rolls the number back). `last_seq` is NOT NULL DEFAULT 0, so the first message gets 1.
   *
   * Idempotent on `(authorId, clientMsgId)` (UL-126): a retry hits the unique index, the whole
   * transaction rolls back (so `last_seq` is not advanced and no number is spent), and the stored
   * row is read afterwards. The read must run outside the failed transaction: Postgres rejects every
   * statement in an aborted transaction.
   *
   * A lookup before the transaction is only a fast path: a late retry then takes no channel lock and
   * spends no transaction, so a retry storm does not queue behind real sends. It is not the guard;
   * two concurrent requests both miss it, and the index decides between them.
   *
   * Returns null when the channel does not exist.
   */
  async create(
    channelId: string,
    authorId: string,
    clientMsgId: string,
    body: string,
  ): Promise<CreateMessageRowResult | null> {
    const earlier = await this.findByKey(authorId, clientMsgId);
    if (earlier !== null) {
      return { row: earlier, created: false };
    }
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ last_seq: bigint }[]>`
          UPDATE channels SET last_seq = last_seq + 1
          WHERE id = ${channelId}::uuid
          RETURNING last_seq`;
        const seq = rows[0]?.last_seq;
        if (seq === undefined) {
          return null;
        }
        return tx.message.create({ data: { channelId, authorId, clientMsgId, body, seq } });
      });
      return row === null ? null : { row, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const existing = await this.findByKey(authorId, clientMsgId);
      // No row under this key means the violation came from another constraint: not a retry.
      if (existing === null) {
        throw error;
      }
      return { row: existing, created: false };
    }
  }

  private findByKey(authorId: string, clientMsgId: string): Promise<MessageRow | null> {
    return this.prisma.message.findUnique({
      where: { authorId_clientMsgId: { authorId, clientMsgId } },
    });
  }
}
