import { Injectable } from '@nestjs/common';
import type { CreateProjectRequest, CreateWorkspaceRequest, InviteRole } from '@app/contracts';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma, ProjectRole, WsRole } from '../../generated/prisma/client.js';

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

const projectSelect = {
  id: true,
  name: true,
  key: true,
  description: true,
} satisfies Prisma.ProjectSelect;

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

  removeMember(
    workspaceId: string,
    userId: string,
    currentRole: WsRole,
    actorId: string,
    canRemove: (actorRole: WsRole | null) => boolean,
  ): Promise<'removed' | 'forbidden' | 'conflict'> {
    return this.prisma.$transaction(async (tx) => {
      const memberships = await tx.$queryRaw<{ user_id: string; role: WsRole }[]>`
        SELECT wm.user_id, wm.role FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = ${workspaceId}::uuid
          AND wm.user_id IN (${actorId}::uuid, ${userId}::uuid)
          AND u.deactivated_at IS NULL
        ORDER BY wm.user_id
        FOR UPDATE OF wm
      `;
      const actorRole =
        memberships.find(({ user_id }) => user_id === actorId.toLowerCase())?.role ?? null;
      if (!canRemove(actorRole)) return 'forbidden';
      if (
        memberships.find(({ user_id }) => user_id === userId.toLowerCase())?.role !== currentRole
      ) {
        return 'conflict';
      }

      const membership = await tx.workspaceMember.deleteMany({
        where: { workspaceId, userId, role: currentRole },
      });
      if (membership.count === 0) return 'conflict';

      await tx.projectMember.deleteMany({ where: { userId, project: { workspaceId } } });
      return 'removed';
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

  async createProjectWithAdmin(
    workspaceId: string,
    { name, key, description }: CreateProjectRequest,
    userId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const membership = await tx.$queryRaw<{ user_id: string }[]>`
          SELECT user_id FROM workspace_members
          WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${userId}::uuid
          FOR UPDATE
        `;
        if (membership.length === 0) return undefined;

        return tx.project.create({
          data: {
            workspaceId,
            name,
            key,
            description,
            members: { create: { userId, role: ProjectRole.ADMIN } },
          },
          select: projectSelect,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.project.findUnique({
          where: { workspaceId_key: { workspaceId, key } },
          select: { id: true },
        });
        if (existing) return null;
      }
      throw error;
    }
  }

  listProjects(workspaceId: string, memberId?: string) {
    return this.prisma.project.findMany({
      where: { workspaceId, ...(memberId ? { members: { some: { userId: memberId } } } : {}) },
      select: projectSelect,
      orderBy: { key: 'asc' },
    });
  }

  findProjectByKey(workspaceId: string, key: string) {
    return this.prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key } },
      select: projectSelect,
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
