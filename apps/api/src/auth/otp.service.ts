import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

import { Msg91Service } from './msg91.service';
import type { SmsOtpProvider } from './otp-provider';
import { TwilioService } from './twilio.service';

/**
 * OTP facade (Phase 11). Picks the active SMS provider from `OTP_PROVIDER`
 * (default `msg91`) so the rest of the app is provider-agnostic. Switch to
 * Twilio by setting `OTP_PROVIDER=twilio` in Doppler — no code change.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly msg91: Msg91Service,
    private readonly twilio: TwilioService,
  ) {}

  private get provider(): SmsOtpProvider {
    return this.config.get('OTP_PROVIDER') === 'twilio' ? this.twilio : this.msg91;
  }

  get activeProvider(): 'msg91' | 'twilio' {
    return this.provider.name;
  }

  async sendOtp(phoneE164: string): Promise<{ sent: boolean; provider: 'msg91' | 'twilio' }> {
    const provider = this.provider;
    const { sent } = await provider.sendOtp(phoneE164);
    return { sent, provider: provider.name };
  }

  /** Verify a code if the active provider supports server-side check (Twilio). */
  async verifyOtp(phoneE164: string, code: string): Promise<{ valid: boolean; supported: boolean }> {
    const provider = this.provider;
    if (!provider.verifyOtp) return { valid: false, supported: false };
    const { valid } = await provider.verifyOtp(phoneE164, code);
    return { valid, supported: true };
  }
}
