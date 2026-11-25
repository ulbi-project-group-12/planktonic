import { GoneException, Injectable } from '@nestjs/common';
import type { CreateWorkspaceRequest, InviteRole } from '@app/contracts';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma, WsRole } from '../../generated/prisma/client.js';

function activeInviteConditions(now = new Date()) {
  return { expiresAt: { gt: now }, revokedAt: null, consumedAt: null };
}

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

  async createInvite(data: {
    workspaceId: string;
    createdById: string;
    role: InviteRole;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.invite.create({ data, select: { id: true } });
  }

  findActiveInvite(tokenHash: string) {
    return this.prisma.invite.findUnique({
      where: { tokenHash, ...activeInviteConditions() },
      select: { role: true, workspace: { select: { name: true, slug: true } } },
    });
  }

  acceptInvite(tokenHash: string, userId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { tokenHash, ...activeInviteConditions() },
        select: { id: true, workspaceId: true, role: true, workspace: { select: { slug: true } } },
      });
      if (!invite) throw new GoneException('Invite is no longer valid');

      const membership = await tx.workspaceMember.createMany({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
        skipDuplicates: true,
      });
      if (membership.count === 0) return invite.workspace.slug;

      const now = new Date();
      const consumed = await tx.invite.updateMany({
        where: { id: invite.id, ...activeInviteConditions(now) },
        data: { consumedAt: now },
      });
      // Another request can consume or revoke the link first. Roll back the new membership.
      if (consumed.count === 0) throw new GoneException('Invite is no longer valid');
      return invite.workspace.slug;
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
