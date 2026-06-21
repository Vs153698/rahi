import { Injectable } from '@nestjs/common';
import * as turf from '@turf/turf';

import type { ComputedRoute } from '@rahi/shared';

import type { RequestContext } from '../common/auth-context';

import { GraphHopperClient, type LngLat } from './graphhopper.client';
import { RoutesRepository } from './routes.repository';

const ENGINE_VERSION = 'graphhopper-car-v1';
const CORRIDOR_BUFFER_KM = 5; // POI corridor width each side (rahi-docs/07 §2)

/**
 * Computes a route via GraphHopper, buffers the line into a corridor polygon
 * (used later for POI ingestion in Phase 3), and persists both to `routes`.
 * Returns the computed route so the caller can confirm; the device gets it via
 * sync (rahi-docs/07 §3).
 */
@Injectable()
export class RoutingService {
  constructor(
    private readonly graphhopper: GraphHopperClient,
    private readonly routes: RoutesRepository,
  ) {}

  buildCorridor(route: ComputedRoute): unknown {
    const line = turf.lineString(route.coordinates);
    const buffered = turf.buffer(line, CORRIDOR_BUFFER_KM, { units: 'kilometers' });
    return buffered?.geometry ?? null;
  }

  async computeForTrip(
    ctx: RequestContext,
    tripId: string,
    start: LngLat,
    end: LngLat,
  ): Promise<{ routeId: string; route: ComputedRoute }> {
    const route = await this.graphhopper.route(start, end);
    const corridor = this.buildCorridor(route);
    const routeId = await this.routes.upsertForTrip(ctx, tripId, route, corridor, ENGINE_VERSION);
    return { routeId, route };
  }
}
