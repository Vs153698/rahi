import { Injectable, Logger } from '@nestjs/common';

import { parseGraphHopperPath, type ComputedRoute, type GraphHopperPath } from '@rahi/shared';

import { AppConfigService } from '../config/app-config.service';

export interface LngLat {
  lng: number;
  lat: number;
}

/**
 * Self-hosted GraphHopper client (rahi-docs/07 §3). Requests GeoJSON points
 * (`points_encoded=false`) so the shared pure parser can shape the route + turn
 * instructions identically everywhere. No-op-safe when GRAPHHOPPER_BASE_URL is
 * unset (Phase 2 before the routing box is provisioned — // verify).
 */
@Injectable()
export class GraphHopperClient {
  private readonly logger = new Logger(GraphHopperClient.name);

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get('GRAPHHOPPER_BASE_URL'));
  }

  async route(start: LngLat, end: LngLat): Promise<ComputedRoute> {
    const base = this.config.get('GRAPHHOPPER_BASE_URL');
    if (!base) {
      throw new Error('Routing engine not configured');
    }
    const url = new URL('/route', base);
    url.searchParams.set('profile', 'car');
    url.searchParams.set('points_encoded', 'false');
    url.searchParams.set('instructions', 'true');
    // GraphHopper expects point=lat,lng
    url.searchParams.append('point', `${start.lat},${start.lng}`);
    url.searchParams.append('point', `${end.lat},${end.lng}`);

    const res = await fetch(url);
    if (!res.ok) {
      this.logger.error(`GraphHopper returned ${res.status}`);
      throw new Error('Route computation failed');
    }
    const body = (await res.json()) as { paths?: GraphHopperPath[] };
    const path = body.paths?.[0];
    if (!path) throw new Error('No route found');
    return parseGraphHopperPath(path);
  }
}
