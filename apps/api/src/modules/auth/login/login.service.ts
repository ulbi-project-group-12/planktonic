import { createHash, randomUUID } from 'node:crypto';
import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { LoginRequest } from '@app/contracts';
import { verify } from 'argon2';
import type { Env } from '../../../core/config/env.js';
import { LoginAttemptsConnection } from './login-attempts.connection.js';
import type { AttemptOutcome } from './login-attempts.store.js';
import { LoginRepository } from './login.repository.js';
import { SessionRepository } from '../session/session.repository.js';

// Match registration's Argon2id cost even when the account has no usable password.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dn9YKrkPZQwCe7HU2QLvIQ$CY2akyOO+xFZU7CaoEt1pS6jeDALiqq82mEO5F1SX44';

const REFRESH_TTL_DAYS = 7;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class LoginService {
  constructor(
    private readonly repository: LoginRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env>,
    private readonly attempts: LoginAttemptsConnection,
  ) {}

  async login(
    { email, password }: LoginRequest,
    ip: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const accessSecret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET', { infer: true });
    if (!accessSecret || !refreshSecret) {
      throw new ServiceUnavailableException('Login is unavailable');
    }

    const admission = await this.attempts.run((store) => store.begin(email, ip));
    if ('retryAfterMs' in admission) {
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too many login attempts',
          retryAfterSeconds: Math.ceil(admission.retryAfterMs / 1000),
        },
        429,
      );
    }

    let outcome: AttemptOutcome = 'cancelled';
    try {
      const user = await this.repository.findActiveByEmail(email);
      const passwordHash = user?.passwordHash.startsWith('$argon2id$') ? user.passwordHash : null;
      const matches = await verify(passwordHash ?? DUMMY_PASSWORD_HASH, password);
      if (!user || !passwordHash || !matches) {
        outcome = 'failure';
        throw new UnauthorizedException('Invalid email or password');
      }

      const sessionId = randomUUID();
      const jti = randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

      const refreshToken = await this.jwt.signAsync(
        { sub: user.id, sid: sessionId, jti, exp: Math.floor(expiresAt.getTime() / 1000) },
        { secret: refreshSecret, algorithm: 'HS256' },
      );
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

      const { browser, os } = this.parseUserAgent(userAgent);
      await this.sessionRepository.create({
        id: sessionId,
        userId: user.id,
        browser,
        os,
        refreshTokenHash,
        expiresAt,
      });

      const accessToken = await this.jwt.signAsync(
        { sub: user.id, sid: sessionId },
        { secret: accessSecret, algorithm: 'HS256', expiresIn: '15m' },
      );
      outcome = 'success';
      return { accessToken, refreshToken, sessionId };
    } finally {
      await this.attempts.run((store) => store.finish(email, ip, admission.id, outcome));
    }
  }

  private parseUserAgent(userAgent?: string): { browser: string | null; os: string | null } {
    if (!userAgent) return { browser: null, os: null };

    const browserMatch =
      /(Edg|OPR|YaBrowser)\/(\d+)/i.exec(userAgent) ??
      /(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/i.exec(userAgent);
    const [, browserName = '', browserMajor = ''] = browserMatch ?? [];
    const browserAliases: Record<string, string> = {
      edg: 'Edge',
      opr: 'Opera',
      yabrowser: 'YaBrowser',
    };
    const browser = browserName
      ? `${browserAliases[browserName.toLowerCase()] ?? browserName} ${browserMajor}`
      : null;

    const osMatch =
      /Windows NT (\d+\.\d+)|Mac OS X (\d+[._]\d+)|Android (\d+)|iPhone OS (\d+[._]\d+)/i.exec(
        userAgent,
      );
    let os: string | null = null;
    if (osMatch) {
      if (osMatch[1]) os = `Windows ${osMatch[1]}`;
      else if (osMatch[2]) os = `macOS ${osMatch[2].replace(/_/g, '.')}`;
      else if (osMatch[3]) os = `Android ${osMatch[3]}`;
      else if (osMatch[4]) os = `iOS ${osMatch[4].replace(/_/g, '.')}`;
    } else if (/Linux/i.test(userAgent)) {
      os = 'Linux';
    }

    return { browser, os };
  }
}
