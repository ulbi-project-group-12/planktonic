import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

export interface CreateSessionData {
  id: string;
  userId: string;
  browser: string | null;
  os: string | null;
  refreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSessionData) {
    return this.prisma.session.create({ data });
  }

  findActiveById(id: string) {
    return this.prisma.session.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  findActiveByIdWithUser(id: string) {
    return this.prisma.session.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async rotateRefreshToken(
    id: string,
    oldHash: string,
    newHash: string,
    now: Date,
  ): Promise<boolean> {
    const [result] = await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          id,
          revokedAt: null,
          expiresAt: { gt: now },
          refreshTokenHash: oldHash,
        },
        data: { refreshTokenHash: newHash, lastUsedAt: now },
      }),
    ]);
    return result.count > 0;
  }

  revoke(id: string, now: Date) {
    return this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
