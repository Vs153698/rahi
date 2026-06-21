import * as Sentry from '@sentry/node';

import type { Env } from '../config/env.schema';

/**
 * PII scrubbing (rahi-docs/10). Strip anything that could identify a rider
 * before an event leaves the process: phone numbers, OTPs, auth headers,
 * precise coordinates, tokens. Best-effort, fail-open on the event itself.
 */
const PII_KEY_RE = /(phone|msisdn|otp|password|token|secret|authorization|auth_key|jwt|lat|lng|latitude|longitude|email)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEY_RE.test(k) ? '[redacted]' : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

let initialised = false;

export type SentryEnv = Pick<Env, 'NODE_ENV' | 'SENTRY_DSN' | 'SENTRY_TRACES_SAMPLE_RATE'>;

/** Initialise Sentry for the API. No-op when DSN is absent (Phase 0 / local). */
export function initSentry(env: SentryEnv): void {
  if (initialised || !env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        event.request.headers = scrub(event.request.headers) as Record<string, string>;
      }
      if (event.request?.data) event.request.data = scrub(event.request.data);
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      if (event.user) {
        // Keep only a non-PII id reference.
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
  initialised = true;
}

export { Sentry };
