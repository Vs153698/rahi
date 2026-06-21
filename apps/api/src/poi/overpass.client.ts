import { Injectable, Logger } from '@nestjs/common';

import type { OverpassElement } from '@rahi/shared';

import { AppConfigService } from '../config/app-config.service';

/**
 * Overpass (OSM) client (rahi-docs/07 §2). Queries a route corridor polygon for
 * our rider categories. Public Overpass instances are rate-limited — self-host if
 * throttled (// verify, rahi-docs/13). No-op-safe when OVERPASS_API_URL is unset.
 */
@Injectable()
export class OverpassClient {
  private readonly logger = new Logger(OverpassClient.name);

  constructor(private readonly config: AppConfigService) {}

  get endpoint(): string {
    return this.config.get('OVERPASS_API_URL') ?? 'https://overpass-api.de/api/interpreter';
  }

  /**
   * Build an Overpass QL query for a polygon (GeoJSON ring -> "lat lon ..."),
   * across the categories we ingest. `nwr` = node/way/relation; `out center`
   * gives ways/relations a centroid.
   */
  buildQuery(ring: [number, number][]): string {
    // Overpass poly is "lat lon lat lon ..."; GeoJSON ring is [lng, lat].
    const poly = ring.map(([lng, lat]) => `${lat} ${lng}`).join(' ');
    const filters = [
      'nwr["amenity"="fuel"]',
      'nwr["shop"~"motorcycle_repair|car_repair|motorcycle|tyres"]',
      'nwr["amenity"~"hospital|clinic|doctors"]',
      'nwr["amenity"~"atm|bank"]',
      'nwr["amenity"="police"]',
      'nwr["amenity"~"restaurant|fast_food|cafe"]',
      'nwr["tourism"~"guest_house|hostel|viewpoint"]',
      'nwr["amenity"="drinking_water"]',
    ];
    const body = filters.map((f) => `  ${f}(poly:"${poly}");`).join('\n');
    return `[out:json][timeout:60];\n(\n${body}\n);\nout center tags;`;
  }

  async queryCorridor(ring: [number, number][]): Promise<OverpassElement[]> {
    const query = this.buildQuery(ring);
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });
    if (!res.ok) {
      this.logger.error(`Overpass returned ${res.status}`);
      throw new Error('Overpass query failed');
    }
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return data.elements ?? [];
  }
}
