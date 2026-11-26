import { Injectable } from '@nestjs/common';
import type { UpdateMeRequest } from '@app/contracts';
import { PrismaService } from '../../core/prisma/prisma.service.js';

interface StoredProfile {
  id: string;
  name: string;
  email: string;
  tz: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(id: string, patch: UpdateMeRequest): Promise<StoredProfile> {
    return this.prisma.user.update({
      where: { id },
      data: patch,
      select: { id: true, name: true, email: true, tz: true },
    });
  }
}
