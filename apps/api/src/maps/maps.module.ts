import { Module } from '@nestjs/common';

import { TilePacksRepository } from './tile-packs.repository';
import { TilesJob } from './tiles.job';

@Module({
  providers: [TilePacksRepository, TilesJob],
  exports: [TilesJob, TilePacksRepository],
})
export class MapsModule {}
