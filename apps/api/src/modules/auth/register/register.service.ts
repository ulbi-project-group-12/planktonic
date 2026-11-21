import { ConflictException, Injectable } from '@nestjs/common';
import type { RegisterConflictResponse, RegisterRequest, RegisterResponse } from '@app/contracts';
import { argon2id, hash } from 'argon2';
import { RegisterRepository } from './register.repository.js';

@Injectable()
export class RegisterService {
  constructor(private readonly repository: RegisterRepository) {}

  async register({ name, email, password }: RegisterRequest): Promise<RegisterResponse> {
    const passwordHash = await hash(password, { type: argon2id });
    const user = await this.repository.create(name, email, passwordHash);
    if (user === null) {
      const message = 'Email is already in use';
      const response: RegisterConflictResponse = {
        statusCode: 409,
        message,
        issues: [{ path: 'email', message }],
      };
      throw new ConflictException(response);
    }
    return { id: user.id, name: user.name, email: user.email };
  }
}
