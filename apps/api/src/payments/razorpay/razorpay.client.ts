import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { assertRail } from '@rahi/shared';

import { AppConfigService } from '../../config/app-config.service';

/**
 * Razorpay client for trip-money pay-in (rahi-docs/09 B1, Task 5.5). Trip money
 * is the Razorpay/UPI rail ONLY — never IAP (assertRail enforces it). Rahi never
 * custodies funds: a group collects its own kitty as a normal merchant
 * collection. Signatures are ALWAYS verified server-side (never trust the client).
 */
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

@Injectable()
export class RazorpayClient {
  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get('RAZORPAY_KEY_ID') && this.config.get('RAZORPAY_KEY_SECRET'));
  }

  /** Create an order for a kitty contribution (amount in paise). */
  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
    assertRail('trip_money', 'razorpay');
    const keyId = this.config.get('RAZORPAY_KEY_ID');
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) throw new Error('Razorpay not configured');

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
    const order = (await res.json()) as RazorpayOrder;
    return order;
  }

  /** Verify the checkout callback signature: HMAC_SHA256(order_id|payment_id). */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = this.config.get('RAZORPAY_KEY_SECRET');
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqualHex(expected, signature);
  }

  /** Verify a webhook body signature against the webhook secret. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }
}

/** Constant-time hex compare; false on length mismatch (avoids timing leaks). */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
