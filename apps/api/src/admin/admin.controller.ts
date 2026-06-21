import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { AppConfigService } from '../config/app-config.service';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { ModerationRepository, type ReviewItem } from './moderation.repository';

const ResolveSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['visible', 'removed']),
});

/**
 * Admin moderation endpoints (Task 9.4). Restricted to admin user ids configured
 * out-of-band (ADMIN_USER_IDS). Phase 9 ships the queue + resolve; a fuller admin
 * surface lands in Phase 11 hardening (rahi-docs/10/11).
 */
@Controller('admin/moderation')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly config: AppConfigService,
    private readonly moderation: ModerationRepository,
  ) {}

  private assertAdmin(ctx: RequestContext): void {
    const admins = (this.config.get('ADMIN_USER_IDS') ?? '').split(',').map((s) => s.trim());
    if (!admins.includes(ctx.userId)) throw new ForbiddenException('Admins only');
  }

  @Get('queue')
  queue(@CurrentUser() ctx: RequestContext): Promise<ReviewItem[]> {
    this.assertAdmin(ctx);
    return this.moderation.reviewQueue();
  }

  @Post('resolve')
  async resolve(@CurrentUser() ctx: RequestContext, @Body() body: unknown): Promise<{ ok: true }> {
    this.assertAdmin(ctx);
    const input = ResolveSchema.parse(body);
    await this.moderation.resolve(input.id, input.decision);
    return { ok: true };
  }
}
