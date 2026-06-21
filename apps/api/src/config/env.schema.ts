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

  // OTP provider switch — 'msg91' (India/DLT) or 'twilio' (Verify API).
  OTP_PROVIDER: z.enum(['msg91', 'twilio']).default('msg91'),

  // MSG91 (OTP) — required when OTP_PROVIDER=msg91. // verify
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),

  // Twilio Verify (OTP) — required when OTP_PROVIDER=twilio.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  REDIS_URL: z.string().optional(),

  // Maps / routing (Phase 2) — optional until provisioned. // verify
  GRAPHHOPPER_BASE_URL: z.string().url().optional(),
  OVERPASS_API_URL: z.string().url().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_TILES: z.string().default('rahi-tiles'),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),

  // Subscriptions (Phase 5) — RevenueCat server validation + webhook auth.
  REVENUECAT_SECRET_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_AUTH_HEADER: z.string().optional(),

  // Trip money (Phase 5) — Razorpay pay-in. // verify
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Admin moderation (Phase 9) — comma-separated admin user ids.
  ADMIN_USER_IDS: z.string().optional(),
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
