import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

import type { SmsOtpProvider } from './otp-provider';

/**
 * Twilio Verify OTP provider (Phase 11). Uses the Verify API, which generates,
 * sends and checks the code for us — no DLT template needed, so it's a good
 * default while MSG91/DLT registration is pending. Selected when
 * OTP_PROVIDER=twilio. Never logs the phone or code.
 */
@Injectable()
export class TwilioService implements SmsOtpProvider {
  readonly name = 'twilio' as const;
  private readonly logger = new Logger(TwilioService.name);

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get('TWILIO_ACCOUNT_SID') &&
        this.config.get('TWILIO_AUTH_TOKEN') &&
        this.config.get('TWILIO_VERIFY_SERVICE_SID'),
    );
  }

  private auth(): string {
    const sid = this.config.get('TWILIO_ACCOUNT_SID') as string;
    const token = this.config.get('TWILIO_AUTH_TOKEN') as string;
    return Buffer.from(`${sid}:${token}`).toString('base64');
  }

  async sendOtp(phoneE164: string): Promise<{ sent: boolean }> {
    if (!this.isConfigured) {
      this.logger.warn('Twilio not configured — OTP send skipped (log-only mode).');
      return { sent: false };
    }
    const serviceSid = this.config.get('TWILIO_VERIFY_SERVICE_SID') as string;
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.auth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phoneE164, Channel: 'sms' }).toString(),
      },
    );
    if (!res.ok) {
      this.logger.error(`Twilio Verify send failed (${res.status})`);
      return { sent: false };
    }
    return { sent: true };
  }

  async verifyOtp(phoneE164: string, code: string): Promise<{ valid: boolean }> {
    if (!this.isConfigured) return { valid: false };
    const serviceSid = this.config.get('TWILIO_VERIFY_SERVICE_SID') as string;
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.auth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }).toString(),
      },
    );
    if (!res.ok) return { valid: false };
    const body = (await res.json()) as { status?: string };
    return { valid: body.status === 'approved' };
  }
}
