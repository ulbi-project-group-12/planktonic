import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type {
  RegisterConflictResponse,
  RegisterRequest,
  RegisterResponse,
  ValidationErrorResponse,
} from '@app/contracts';
import { argon2id, hash } from 'argon2';
import { PasswordBreachService } from './password-breach.service.js';
import { RegisterRepository } from './register.repository.js';

@Injectable()
export class RegisterService {
  constructor(
    private readonly repository: RegisterRepository,
    private readonly passwordBreach: PasswordBreachService,
  ) {}

  async register({ name, email, password }: RegisterRequest): Promise<RegisterResponse> {
    if (await this.passwordBreach.isBlocked(password)) {
      const response: ValidationErrorResponse = {
        statusCode: 400,
        message: 'Validation failed',
        issues: [
          {
            path: 'password',
            message: 'Этот пароль слишком распространён или встречался в утечках. Выберите другой.',
          },
        ],
      };
      throw new BadRequestException(response);
    }

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
