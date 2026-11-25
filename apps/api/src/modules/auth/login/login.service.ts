import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { LoginRequest, LoginResponse } from '@app/contracts';
import { verify } from 'argon2';
import type { Env } from '../../../core/config/env.js';
import { LoginAttemptsConnection } from './login-attempts.connection.js';
import type { AttemptOutcome } from './login-attempts.store.js';
import { LoginRepository } from './login.repository.js';

// Match registration's Argon2id cost even when the account has no usable password.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dn9YKrkPZQwCe7HU2QLvIQ$CY2akyOO+xFZU7CaoEt1pS6jeDALiqq82mEO5F1SX44';

@Injectable()
export class LoginService {
  constructor(
    private readonly repository: LoginRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env>,
    private readonly attempts: LoginAttemptsConnection,
  ) {}

  async login({ email, password }: LoginRequest, ip: string): Promise<LoginResponse> {
    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    if (!secret) {
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

      const accessToken = await this.jwt.signAsync(
        { sub: user.id },
        { secret, algorithm: 'HS256', expiresIn: '15m' },
      );
      outcome = 'success';
      return { accessToken };
    } finally {
      await this.attempts.run((store) => store.finish(email, ip, admission.id, outcome));
    }
  }
}
