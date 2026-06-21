import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { RazorpayClient } from './razorpay/razorpay.client';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [RazorpayClient, PaymentsRepository],
  exports: [RazorpayClient],
})
export class PaymentsModule {}
