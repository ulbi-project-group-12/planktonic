import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

/** Prisma access for channels (STACK §3.1). */
@Injectable()
export class ChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllIds(): Promise<string[]> {
    const rows = await this.prisma.channel.findMany({ select: { id: true } });
    return rows.map((row) => row.id);
  }
}
