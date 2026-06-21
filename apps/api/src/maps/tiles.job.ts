import { Injectable, Logger } from '@nestjs/common';

import { TilePacksRepository } from './tile-packs.repository';

/**
 * Offline tile-pack generation (Task 2.2, rahi-docs/07 §1). In production this
 * runs as a BullMQ job on Upstash Redis (rahi-docs/01 §3): given a trip corridor
 * (bbox + zoom range), it produces a PMTiles extract from the India base
 * (`pmtiles extract` / planetiler), uploads it to Cloudflare R2, and flips the
 * `tile_packs` row to `ready` with the URL + size. The device then downloads it
 * on wifi (offlinePacks.ts).
 *
 * Phase 2 wires the orchestration and persistence; the actual extract + R2 upload
 * are stubbed behind clear seams until the tile pipeline + R2 are provisioned
 * (// verify, rahi-docs/13).
 */
export interface TilePackJobInput {
  tripId: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  zoomMin: number;
  zoomMax: number;
}

export interface ExtractResult {
  pmtilesUrl: string;
  sizeBytes: number;
}

/** Seam for the real extract + R2 upload; swapped for the pipeline in production. */
export interface TileExtractor {
  extractAndUpload(input: TilePackJobInput, packId: string): Promise<ExtractResult>;
}

/** Phase-2 placeholder extractor — records intent without producing tiles yet. */
export class StubTileExtractor implements TileExtractor {
  async extractAndUpload(_input: TilePackJobInput, packId: string): Promise<ExtractResult> {
    // TODO(phase-2-infra): run `pmtiles extract` over the India base for the bbox,
    // upload to R2 bucket `tiles`, return the public URL + byte size.
    return { pmtilesUrl: `r2://tiles/${packId}.pmtiles`, sizeBytes: 0 };
  }
}

function bboxToPolygon([w, s, e, n]: TilePackJobInput['bbox']): unknown {
  return {
    type: 'Polygon',
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  };
}

@Injectable()
export class TilesJob {
  private readonly logger = new Logger(TilesJob.name);
  // Swapped for the real extractor (pmtiles + R2) when the pipeline lands.
  private extractor: TileExtractor = new StubTileExtractor();

  constructor(private readonly packs: TilePacksRepository) {}

  /** Test/infra seam to inject a real or fake extractor. */
  useExtractor(extractor: TileExtractor): void {
    this.extractor = extractor;
  }

  /** Create the pending row, generate the extract, mark ready (or failed). */
  async run(input: TilePackJobInput): Promise<{ packId: string; status: 'ready' | 'failed' }> {
    const packId = await this.packs.createPending({
      tripId: input.tripId,
      bboxGeoJson: bboxToPolygon(input.bbox),
      zoomMin: input.zoomMin,
      zoomMax: input.zoomMax,
    });
    try {
      const { pmtilesUrl, sizeBytes } = await this.extractor.extractAndUpload(input, packId);
      await this.packs.markReady(packId, pmtilesUrl, sizeBytes);
      return { packId, status: 'ready' };
    } catch (err) {
      this.logger.error(`Tile pack ${packId} failed: ${err instanceof Error ? err.message : err}`);
      await this.packs.markFailed(packId);
      return { packId, status: 'failed' };
    }
  }
}
