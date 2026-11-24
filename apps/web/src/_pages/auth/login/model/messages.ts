import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '@app/contracts';

export type LoginField = 'email' | 'password';

export function validationMessage(field: LoginField, type: string | undefined): string {
  switch (field) {
    case 'email':
      if (type === 'too_big') return `Email — не длиннее ${String(EMAIL_MAX_LENGTH)} символов`;
      return 'Введите корректный email';
    case 'password':
      if (type === 'too_big') return `Пароль — не длиннее ${String(PASSWORD_MAX_LENGTH)} символов`;
      return 'Введите пароль';
  }
}

export const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';
