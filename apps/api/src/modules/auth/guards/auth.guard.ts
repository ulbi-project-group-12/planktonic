import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import type { Env } from '../../../core/config/env.js';
import { AuthRepository } from '../auth.repository.js';
import type { AuthRequest } from '../auth.request.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

const accessTokenClaims = z.object({
  sub: z.uuid(),
  exp: z.int().positive(),
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env>,
    private readonly repository: AuthRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = /^Bearer +([^\s,]+)$/i.exec(request.headers.authorization ?? '')?.[1];
    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    if (!token || !secret) {
      throw new UnauthorizedException();
    }

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, { secret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException();
    }

    const claims = accessTokenClaims.safeParse(payload);
    if (!claims.success) {
      throw new UnauthorizedException();
    }

    const user = await this.repository.findActiveById(claims.data.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    const { id, name, email } = user;
    request.user = { id, name, email };
    return true;
  }
}
