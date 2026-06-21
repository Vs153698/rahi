import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from './jwt.guard';
import { OtpRateLimiter } from './otp.rate-limiter';
import { OtpService } from './otp.service';

const RequestOtpSchema = z.object({
  // +91 followed by a 10-digit Indian mobile number.
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Expected a +91 mobile number'),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly rateLimiter: OtpRateLimiter,
  ) {}

  /**
   * Triggers an OTP send via the configured provider (MSG91 or Twilio).
   * Rate-limited per phone. For MSG91 the OTP lifecycle is owned by Supabase Auth
   * phone sign-in; Twilio Verify can also check the code server-side.
   */
  @Post('otp/request')
  @HttpCode(202)
  async requestOtp(
    @Body() body: unknown,
  ): Promise<{ status: 'accepted' | 'rate_limited'; provider: 'msg91' | 'twilio' }> {
    const { phone } = RequestOtpSchema.parse(body);
    if (!this.rateLimiter.allow(phone)) {
      return { status: 'rate_limited', provider: this.otp.activeProvider };
    }
    const { provider } = await this.otp.sendOtp(phone);
    return { status: 'accepted', provider };
  }

  /** Example protected route — proves JWT verification end-to-end. */
  @Post('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  me(): { ok: true } {
    return { ok: true };
  }
}
