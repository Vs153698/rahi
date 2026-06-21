import { Module } from '@nestjs/common';

import { PoiIngestService } from './ingest.job';
import { OverpassClient } from './overpass.client';
import { PoiCorridorRepository } from './poi-corridor.repository';
import { PoiRepository } from './poi.repository';

@Module({
  providers: [OverpassClient, PoiRepository, PoiCorridorRepository, PoiIngestService],
  exports: [PoiIngestService],
})
export class PoiModule {}
