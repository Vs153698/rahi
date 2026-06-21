import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { TripsRepository, type TripRow } from './repositories/trips.repository';

const CreateTripSchema = z.object({ title: z.string().min(1).max(120) });

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsRepository) {}

  @Get()
  list(@CurrentUser() ctx: RequestContext): Promise<TripRow[]> {
    return this.trips.listForUser(ctx);
  }

  @Post()
  create(@CurrentUser() ctx: RequestContext, @Body() body: unknown): Promise<TripRow> {
    const input = CreateTripSchema.parse(body);
    return this.trips.create(ctx, input);
  }
}
