import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

/**
 * MSG91 SMS/OTP provider (DLT-template-ready — rahi-docs/10). Phase 0 wires the
 * interface and request shape; the actual OTP *generation + verification* is
 * handled by Supabase Auth phone sign-in. MSG91 is the underlying SMS sender,
 * configured DLT templates included.
 *
 * Until MSG91 + DLT registration completes (lead time — rahi-docs/10), this
 * runs in "log-only" mode and never sends a real SMS. // verify provisioning
 */
@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);
  private readonly endpoint = 'https://control.msg91.com/api/v5/otp';

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get('MSG91_AUTH_KEY') && this.config.get('MSG91_OTP_TEMPLATE_ID'));
  }

  /**
   * Send an OTP SMS to an E.164 (+91...) number via a DLT-approved template.
   * Returns whether a real send was attempted. Never logs the phone or code.
   */
  async sendOtp(phoneE164: string): Promise<{ sent: boolean }> {
    if (!this.isConfigured) {
      this.logger.warn('MSG91 not configured — OTP send skipped (Phase-0 log-only mode).');
      return { sent: false };
    }

    const authKey = this.config.get('MSG91_AUTH_KEY') as string;
    const templateId = this.config.get('MSG91_OTP_TEMPLATE_ID') as string;

    const url = new URL(this.endpoint);
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('mobile', phoneE164.replace('+', ''));

    const res = await fetch(url, {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      // Do not include the phone number in the error.
      this.logger.error(`MSG91 OTP send failed with status ${res.status}`);
      return { sent: false };
    }
    return { sent: true };
  }
}
