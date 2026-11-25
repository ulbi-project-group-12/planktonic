import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWorkspaceRole(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId }, user: { deactivatedAt: null } },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  async isActiveUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deactivatedAt: null },
      select: { id: true },
    });
    return user !== null;
  }
}
