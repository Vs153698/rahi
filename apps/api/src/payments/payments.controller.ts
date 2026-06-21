import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { PaymentsRepository } from './payments.repository';
import { RazorpayClient } from './razorpay/razorpay.client';

const OrderSchema = z.object({
  groupId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
});
const VerifySchema = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

/**
 * Razorpay pool pay-in (Task 5.5, rahi-docs/09 B1). Server creates the order and
 * — critically — VERIFIES the signature server-side before crediting the kitty.
 * Idempotent on payment id. Subscriptions never come through here (different
 * module, different rail).
 */
@Controller('payments/razorpay')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly razorpay: RazorpayClient,
    private readonly payments: PaymentsRepository,
  ) {}

  @Post('order')
  async order(@Body() body: unknown): Promise<{ orderId: string; amount: number; currency: string }> {
    const input = OrderSchema.parse(body);
    const order = await this.razorpay.createOrder(input.amountPaise, `kitty_${input.groupId}`);
    return { orderId: order.id, amount: order.amount, currency: order.currency };
  }

  @Post('verify')
  async verify(
    @CurrentUser() ctx: RequestContext,
    @Body() body: unknown,
  ): Promise<{ recorded: boolean }> {
    const input = VerifySchema.parse(body);
    const ok = this.razorpay.verifyPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    );
    if (!ok) {
      // Reject forged/invalid signatures — never trust the client.
      return { recorded: false };
    }
    return this.payments.recordContribution(ctx, {
      groupId: input.groupId,
      memberId: input.memberId,
      amountPaise: input.amountPaise,
      razorpayPaymentId: input.razorpayPaymentId,
    });
  }
}
