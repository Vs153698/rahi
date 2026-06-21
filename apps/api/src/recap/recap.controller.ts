import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { RecapRepository } from './recap.repository';

const RecapSchema = z.object({
  tripId: z.string().uuid(),
  stats: z.object({
    distanceKm: z.number(),
    maxAltitudeM: z.number().nullable(),
    elevationGainM: z.number(),
    durationMinutes: z.number(),
    longestDayKm: z.number(),
    statesCrossed: z.number(),
  }),
  badgeKinds: z.array(z.string()).default([]),
});

@Controller('recap')
@UseGuards(JwtAuthGuard)
export class RecapController {
  constructor(private readonly recap: RecapRepository) {}

  /** Generate a recap after a completed ride: persist stats + badges, render poster. */
  @Post()
  generate(
    @CurrentUser() ctx: RequestContext,
    @Body() body: unknown,
  ): Promise<{ recapId: string; posterR2Key: string }> {
    const input = RecapSchema.parse(body);
    return this.recap.saveRecap(ctx, input.tripId, input.stats, input.badgeKinds);
  }
}
