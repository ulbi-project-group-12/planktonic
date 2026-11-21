import { z } from 'zod';
import { ValidationErrorResponse } from '../errors.js';

export const RegisterRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(15)
      .refine((name) => !name.includes('\u0000'), 'Name must not contain a null character')
      .meta({
        description: 'Display name. Leading and trailing whitespace is trimmed.',
        example: 'Ada',
      }),
    email: z.string().trim().pipe(z.email()).meta({
      description: 'Email address. Leading and trailing whitespace is trimmed.',
      format: 'email',
      example: 'ada@example.com',
    }),
    password: z.string().min(12).meta({
      description: 'Password for the new account.',
      format: 'password',
      writeOnly: true,
      example: 'example-passphrase',
    }),
    confirmPassword: z.string().meta({
      description: 'Must exactly match password.',
      format: 'password',
      writeOnly: true,
      example: 'example-passphrase',
    }),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RegisterResponseSchema = z.object({
  id: z.uuidv7(),
  name: z.string(),
  email: z.email(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const RegisterConflictResponseSchema = ValidationErrorResponse.extend({
  statusCode: z.literal(409),
  issues: z.array(z.object({ path: z.literal('email'), message: z.string() })).min(1),
});

export type RegisterConflictResponse = z.infer<typeof RegisterConflictResponseSchema>;
