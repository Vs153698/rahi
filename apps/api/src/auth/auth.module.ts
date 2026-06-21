import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { Msg91Service } from './msg91.service';
import { OtpRateLimiter } from './otp.rate-limiter';
import { OtpService } from './otp.service';
import { TwilioService } from './twilio.service';

@Module({
  controllers: [AuthController],
  providers: [JwtAuthGuard, Msg91Service, TwilioService, OtpService, OtpRateLimiter],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
