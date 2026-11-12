import { PrismaService } from '../core/prisma/index.js';

export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  count(): number {
    return this.prisma.$queryRaw();
  }
}
