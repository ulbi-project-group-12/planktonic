import { PrismaService } from '../core/prisma/prisma.service.js';
import { MessagesRepository } from './messages.repository.js';
import { listRows } from './messages.repository.js';

export class MessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesRepository,
  ) {}

  list(): number {
    return this.messages.count() + listRows().length;
  }
}
