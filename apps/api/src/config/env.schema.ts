import { z } from 'zod';

/**
 * Runtime environment contract for the API. Validated at boot — the process
 * refuses to start with a missing/invalid var rather than failing deep in a
 * request. Secrets are injected by Doppler (rahi-docs/12); nothing here has a
 * committed default beyond non-secret toggles.
 *
 * Phase 0: service vars are optional so the app + /health boot before accounts
 * are provisioned. They become required as their features land (see // verify).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Supabase — optional in Phase 0 until the Mumbai project exists. // verify
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),

  // MSG91 (OTP) — required once OTP goes live (Phase 0 Task 0.5). // verify
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  REDIS_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Used by Nest ConfigModule `validate`. Throws (with a readable message) on bad env. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
