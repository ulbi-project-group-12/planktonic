// Environment schema for the api (D-13): validated by zod through @nestjs/config's `validate`
// hook, never nestjs-zod. Errors name the variable and the rule, never the received value,
// so a misplaced secret cannot reach the logs.
import { z } from 'zod';

/** `.env.example` documents `NAME=` (empty) as "use the default", so empty means unset. */
const emptyAsUnset = (value: unknown): unknown => (value === '' ? undefined : value);

export const envSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyAsUnset,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  API_PORT: z.preprocess(emptyAsUnset, z.coerce.number().int().min(1).max(65535).default(3001)),
  // Interface the api binds to. Loopback by default, so `pnpm dev` is not reachable from the
  // LAN; the image sets 0.0.0.0 because a container must listen on every interface.
  API_HOST: z.preprocess(emptyAsUnset, z.string().trim().min(1).default('127.0.0.1')),
  // Required: the app has no database default. Only postgres:// and postgresql:// URLs pass.
  DATABASE_URL: z.preprocess(emptyAsUnset, z.url({ protocol: /^postgres(ql)?$/ })),
});

export type Env = z.output<typeof envSchema>;

/** ConfigModule `validate` hook: returns the typed config or throws a value-free message. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
  );
  throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
