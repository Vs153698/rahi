import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import type { ComputedRoute } from '@rahi/shared';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { RoutingService } from './routing.service';

const point = z.object({ lng: z.number().min(-180).max(180), lat: z.number().min(-90).max(90) });
const ComputeRouteSchema = z.object({
  tripId: z.string().uuid(),
  start: point,
  end: point,
});

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  /**
   * Compute + persist a route for a trip. Non-synced operation (rahi-docs/05 §6):
   * the device calls this when online; the result arrives back via sync and is
   * cached for offline nav. The client blocks only the *route* feature when
   * offline, never the app.
   */
  @Post('compute')
  compute(
    @CurrentUser() ctx: RequestContext,
    @Body() body: unknown,
  ): Promise<{ routeId: string; route: ComputedRoute }> {
    const input = ComputeRouteSchema.parse(body);
    return this.routing.computeForTrip(ctx, input.tripId, input.start, input.end);
  }
}
