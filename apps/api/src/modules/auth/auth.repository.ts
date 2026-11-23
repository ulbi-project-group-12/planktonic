import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deactivatedAt: null },
      select: { id: true, name: true, email: true, tokenVersion: true },
    });
  }
}
