import { Injectable } from '@nestjs/common';
import type { CreateWorkspaceRequest } from '@app/contracts';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma, WsRole } from '../../generated/prisma/client.js';

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: { id: true, name: true, slug: true },
      orderBy: { slug: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
  }

  async createWithOwner({ name, slug }: CreateWorkspaceRequest, userId: string) {
    try {
      return await this.prisma.workspace.create({
        data: { name, slug, members: { create: { userId, role: WsRole.OWNER } } },
        select: { id: true, name: true, slug: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.workspace.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (existing) return null;
      }
      throw error;
    }
  }
}
