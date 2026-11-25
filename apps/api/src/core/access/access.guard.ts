import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';
import { AccessMetadata, type RouteAccess } from './access.metadata.js';
import { AccessService } from './access.service.js';

interface AccessRequest {
  user?: { id: string };
  params?: Record<string, string | undefined>;
}

const workspaceIdSchema = z.uuid();

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RouteAccess | undefined>(AccessMetadata.KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rule) return false;

    const { user, params } = context.switchToHttp().getRequest<AccessRequest>();
    if (!user) throw new UnauthorizedException();

    if (rule.kind === 'authenticated') return true;
    if (rule.kind === 'permission') return this.access.can(user, rule.permission);

    const workspaceId = workspaceIdSchema.safeParse(params?.[rule.param ?? 'workspaceId']);
    if (!workspaceId.success) throw new BadRequestException('Invalid workspace ID');

    const allowed = await this.access.can(user, rule.permission, { workspaceId: workspaceId.data });
    if (allowed) return true;

    if (!(await this.access.getWorkspaceRole(user, workspaceId.data))) {
      throw new NotFoundException('Workspace not found');
    }
    return false;
  }
}
