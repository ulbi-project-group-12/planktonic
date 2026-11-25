import { z } from 'zod';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from './register.js';

export const LoginRequestSchema = z.object({
  email: z.string().trim().max(EMAIL_MAX_LENGTH).pipe(z.email()).meta({
    description: 'Email address. Leading and trailing whitespace is trimmed.',
    format: 'email',
    example: 'ada@example.com',
  }),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH).meta({
    description: 'Password for the existing account.',
    format: 'password',
    writeOnly: true,
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const LoginRateLimitResponseSchema = z.object({
  statusCode: z.literal(429),
  message: z.literal('Too many login attempts'),
  retryAfterSeconds: z.int().positive(),
});
