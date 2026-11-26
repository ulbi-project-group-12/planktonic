import { Injectable } from '@nestjs/common';
import { type MeResponse, MeResponseSchema, type UpdateMeRequest } from '@app/contracts';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async updateMe(userId: string, patch: UpdateMeRequest): Promise<MeResponse> {
    return MeResponseSchema.parse(await this.repository.updateProfile(userId, patch));
  }
}
