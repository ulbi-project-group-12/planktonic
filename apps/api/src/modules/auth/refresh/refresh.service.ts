import { createHash, randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../core/config/env.js';
import { AuthRepository } from '../auth.repository.js';
import { SessionRepository } from '../session/session.repository.js';

const REFRESH_TTL_DAYS = 7;

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class RefreshService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env>,
    private readonly sessionRepository: SessionRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async refresh(refreshToken: string | undefined): Promise<RefreshResult> {
    const accessSecret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET', { infer: true });
    if (!accessSecret || !refreshSecret) {
      throw new ServiceUnavailableException('Refresh is unavailable');
    }

    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    let payload: { sub: string; sid: string; jti?: string; exp?: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findActiveByIdWithUser(payload.sid);
    if (session?.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    const user = await this.authRepository.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    if (session.refreshTokenHash !== refreshTokenHash) {
      await this.sessionRepository.revoke(session.id, new Date());
      throw new UnauthorizedException();
    }

    const jti = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const newRefreshToken = await this.jwt.signAsync(
      { sub: session.userId, sid: session.id, jti, exp: Math.floor(expiresAt.getTime() / 1000) },
      { secret: refreshSecret, algorithm: 'HS256' },
    );
    const newRefreshTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');

    const rotated = await this.sessionRepository.rotateRefreshToken(
      session.id,
      refreshTokenHash,
      newRefreshTokenHash,
      now,
    );
    if (!rotated) {
      // A concurrent request already consumed this token; treat it as reuse.
      await this.sessionRepository.revoke(session.id, now);
      throw new UnauthorizedException();
    }

    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, sid: session.id },
      { secret: accessSecret, algorithm: 'HS256', expiresIn: '15m' },
    );

    return { accessToken, refreshToken: newRefreshToken, sessionId: session.id };
  }
}
