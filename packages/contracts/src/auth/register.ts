import { z } from 'zod';
import { ValidationErrorResponse } from '../errors.js';
import { UserName } from '../user.js';

/** Longest address a mailbox can have (RFC 5321 path limit); also keeps `lower(email)` indexable. */
export const EMAIL_MAX_LENGTH = 254;

/** Shortest password registration accepts, in characters. */
export const PASSWORD_MIN_LENGTH = 15;

/** Upper bound for a password, in characters: long passphrases fit, hashing input stays bounded. */
export const PASSWORD_MAX_LENGTH = 128;

export const RegisterRequestSchema = z
  .object({
    name: UserName.meta({
      description: 'Display name. Leading and trailing whitespace is trimmed.',
      example: 'Ada',
    }),
    email: z.string().trim().max(EMAIL_MAX_LENGTH).pipe(z.email()).meta({
      description: 'Email address. Leading and trailing whitespace is trimmed.',
      format: 'email',
      example: 'ada@example.com',
    }),
    password: z
      .string()
      .max(PASSWORD_MAX_LENGTH)
      // String.length counts UTF-16 units. Count Unicode code points for the minimum.
      .refine((password) => Array.from(password).length >= PASSWORD_MIN_LENGTH, {
        message: `Password must be at least ${String(PASSWORD_MIN_LENGTH)} characters long`,
      })
      .meta({
        minLength: PASSWORD_MIN_LENGTH,
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
