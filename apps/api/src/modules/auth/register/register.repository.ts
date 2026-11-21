import { Injectable } from '@nestjs/common';
import type { RegisterResponse } from '@app/contracts';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

@Injectable()
export class RegisterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    name: string,
    email: string,
    passwordHash: string,
  ): Promise<RegisterResponse | null> {
    const [user] = await this.prisma.$queryRaw<RegisterResponse[]>`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${passwordHash})
      ON CONFLICT (lower(email)) DO NOTHING
      RETURNING id, name, email`;
    return user ?? null;
  }
}
