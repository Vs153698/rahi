import * as Sentry from '@sentry/react-native';

import { env } from '../config/env';

/**
 * Sentry for the app. PII scrubbing (rahi-docs/10): strip phone/OTP/token/coords
 * before send. No-op when DSN absent (Phase 0 / local).
 */
const PII_KEY_RE =
  /(phone|msisdn|otp|password|token|secret|authorization|jwt|lat|lng|latitude|longitude|email)/i;

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

export function initSentry(): void {
  if (initialised || !env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
      return event;
    },
  });
  initialised = true;
}

export { Sentry };
