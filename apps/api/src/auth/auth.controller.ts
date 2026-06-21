import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from './jwt.guard';
import { Msg91Service } from './msg91.service';
import { OtpRateLimiter } from './otp.rate-limiter';

const RequestOtpSchema = z.object({
  // +91 followed by a 10-digit Indian mobile number.
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Expected a +91 mobile number'),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly msg91: Msg91Service,
    private readonly rateLimiter: OtpRateLimiter,
  ) {}

  /**
   * Triggers an OTP send. Rate-limited per phone. The actual OTP lifecycle
   * (issue + verify) is owned by Supabase Auth phone sign-in on the client;
   * this endpoint exists for server-side rate limiting + the MSG91 path.
   */
  @Post('otp/request')
  @HttpCode(202)
  async requestOtp(@Body() body: unknown): Promise<{ status: 'accepted' | 'rate_limited' }> {
    const { phone } = RequestOtpSchema.parse(body);
    if (!this.rateLimiter.allow(phone)) {
      return { status: 'rate_limited' };
    }
    await this.msg91.sendOtp(phone);
    return { status: 'accepted' };
  }

  /** Example protected route — proves JWT verification end-to-end. */
  @Post('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  me(): { ok: true } {
    return { ok: true };
  }
}
