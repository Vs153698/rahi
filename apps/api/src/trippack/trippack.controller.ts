import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { PoiIngestService } from '../poi/ingest.job';
import { TilesJob } from '../maps/tiles.job';

const PrepareSchema = z.object({
  tripId: z.string().uuid(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  zoomMin: z.number().int().min(0).max(20).default(6),
  zoomMax: z.number().int().min(0).max(20).default(14),
  routeCoordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

/**
 * Trip-pack preparation (Task 9.1). One server call kicks off both heavy jobs for
 * a corridor — tile-pack generation and POI ingestion — so the device can then
 * one-tap download everything for offline use (weather is fetched client-side
 * from keyless Open-Meteo). In production these run as BullMQ jobs; here they run
 * inline behind their existing seams.
 */
@Controller('trippack')
@UseGuards(JwtAuthGuard)
export class TripPackController {
  constructor(
    private readonly tiles: TilesJob,
    private readonly poi: PoiIngestService,
  ) {}

  @Post('prepare')
  async prepare(@Body() body: unknown): Promise<{ tilePackId: string; ingested: number; corridor: number }> {
    const input = PrepareSchema.parse(body);
    const tile = await this.tiles.run({
      tripId: input.tripId,
      bbox: input.bbox,
      zoomMin: input.zoomMin,
      zoomMax: input.zoomMax,
    });
    const poi = await this.poi.run({
      tripId: input.tripId,
      routeCoordinates: input.routeCoordinates,
    });
    return { tilePackId: tile.packId, ingested: poi.ingested, corridor: poi.corridor };
  }
}
