/**
 * SMS OTP provider abstraction (Phase 11). The active provider is chosen by the
 * `OTP_PROVIDER` env var so we can switch between MSG91 (India, DLT-templated)
 * and Twilio (Verify API) without touching call sites — useful before DLT
 * registration completes (Twilio) and after (MSG91).
 */
export interface SmsOtpProvider {
  readonly name: 'msg91' | 'twilio';
  readonly isConfigured: boolean;
  /** Send an OTP to an E.164 number. Returns whether a real send was attempted. */
  sendOtp(phoneE164: string): Promise<{ sent: boolean }>;
  /** Verify a code (Twilio Verify checks server-side; MSG91/Supabase verify elsewhere). */
  verifyOtp?(phoneE164: string, code: string): Promise<{ valid: boolean }>;
}
