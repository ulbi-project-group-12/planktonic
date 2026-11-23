import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

interface LoginUser {
  id: string;
  passwordHash: string;
}

@Injectable()
export class LoginRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByEmail(email: string): Promise<LoginUser | null> {
    const [user] = await this.prisma.$queryRaw<LoginUser[]>`
      SELECT id, password_hash AS "passwordHash"
      FROM users
      WHERE lower(email) = lower(${email}) AND deactivated_at IS NULL`;
    return user ?? null;
  }
}
