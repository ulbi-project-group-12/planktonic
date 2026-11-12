import { PrismaService } from '../core/prisma/prisma.service.js';

export type { Message } from '../generated/prisma/client.js';

export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  count(): number {
    return this.prisma.$queryRaw();
  }
}

export function listRows(): number[] {
  return [];
}
