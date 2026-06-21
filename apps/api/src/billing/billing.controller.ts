import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { mapRevenueCatEvent, type RcEvent } from '@rahi/shared';

import { AppConfigService } from '../config/app-config.service';

import { BillingRepository } from './billing.repository';

interface RcWebhookBody {
  event?: RcEvent & { id?: string };
}

/**
 * RevenueCat webhook (Task 5.3, rahi-docs/09 A3/A6). Authenticated via a shared
 * secret in the Authorization header (configured in the RC dashboard). Maps the
 * event to server state and persists it. Idempotent: re-delivering an event
 * re-derives the same state (upserts).
 */
@Controller('billing/revenuecat')
export class BillingController {
  constructor(
    private readonly config: AppConfigService,
    private readonly billing: BillingRepository,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('authorization') auth: string | undefined,
    @Body() body: RcWebhookBody,
  ): Promise<{ ok: true }> {
    const expected = this.config.get('REVENUECAT_WEBHOOK_AUTH_HEADER');
    if (!expected || auth !== expected) {
      throw new UnauthorizedException('Invalid webhook authorization');
    }

    const event = body.event;
    if (!event?.app_user_id) return { ok: true }; // nothing actionable

    const derived = mapRevenueCatEvent(event);
    await this.billing.applyDerivedBilling(
      event.app_user_id,
      event.product_id ?? null,
      event.app_user_id,
      derived,
    );
    await this.billing.recordReceipt(event.app_user_id, event.type, body);
    return { ok: true };
  }
}
