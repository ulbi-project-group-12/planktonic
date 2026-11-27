import { Injectable } from '@nestjs/common';
import type { CreateWorkspaceRequest, InviteRole } from '@app/contracts';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma, WsRole } from '../../generated/prisma/client.js';

import { requireActiveInvite } from './invite-status.js';

const inviteSelect = {
  id: true,
  workspaceId: true,
  role: true,
  expiresAt: true,
  revokedAt: true,
  consumedAt: true,
  workspace: { select: { name: true, slug: true } },
} satisfies Prisma.InviteSelect;

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

  listMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId, user: { deactivatedAt: null } },
      select: { userId: true, role: true, user: { select: { name: true } } },
      orderBy: [{ user: { name: 'asc' } }, { userId: 'asc' }],
    });
  }

  async changeMemberRole(
    workspaceId: string,
    userId: string,
    currentRole: WsRole,
    newRole: WsRole,
  ) {
    const [updated] = await this.prisma.workspaceMember.updateManyAndReturn({
      where: { workspaceId, userId, role: currentRole, user: { deactivatedAt: null } },
      data: { role: newRole },
      select: { userId: true, role: true, user: { select: { name: true } } },
    });
    return updated;
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

  findInvite(tokenHash: string) {
    return this.prisma.invite.findUnique({ where: { tokenHash }, select: inviteSelect });
  }

  acceptInvite(tokenHash: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = requireActiveInvite(
        await tx.invite.findUnique({ where: { tokenHash }, select: inviteSelect }),
      );
      const workspaceSlug = invite.workspace.slug;
      const membership = await tx.workspaceMember.createMany({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
        skipDuplicates: true,
      });
      if (membership.count === 0) return { workspaceSlug, outcome: 'already_member' } as const;

      const now = new Date();
      const consumed = await tx.invite.updateMany({
        where: { id: invite.id, expiresAt: { gt: now }, revokedAt: null, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count === 0) {
        requireActiveInvite(
          await tx.invite.findUnique({ where: { tokenHash }, select: inviteSelect }),
          now,
        );
        throw new Error('Active invite could not be consumed');
      }
      return { workspaceSlug, outcome: 'joined' } as const;
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
