import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@app/contracts';

export type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword';

/**
 * Russian text for a client-side validation error. The form validates with the contract's
 * `RegisterRequestSchema` as is (one schema for web and api); its messages are English, so the
 * form shows its own text, chosen by field and zod issue code (react-hook-form's `type`).
 */
export function validationMessage(field: RegisterField, type: string | undefined): string {
  switch (field) {
    case 'name':
      if (type === 'too_big') return 'Имя — не длиннее 15 символов';
      return 'Имя — от 2 до 15 символов';
    case 'email':
      if (type === 'too_big') return `Email — не длиннее ${String(EMAIL_MAX_LENGTH)} символов`;
      return 'Введите корректный email';
    case 'password':
      if (type === 'too_big') return `Пароль — не длиннее ${String(PASSWORD_MAX_LENGTH)} символов`;
      return `Пароль — не короче ${String(PASSWORD_MIN_LENGTH)} символов`;
    case 'confirmPassword':
      return 'Пароли не совпадают';
  }
}

export const EMAIL_TAKEN_MESSAGE = 'Этот email уже зарегистрирован — войдите или укажите другой';
