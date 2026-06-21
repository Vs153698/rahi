import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { Msg91Service } from './msg91.service';
import { OtpRateLimiter } from './otp.rate-limiter';

@Module({
  controllers: [AuthController],
  providers: [JwtAuthGuard, Msg91Service, OtpRateLimiter],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
