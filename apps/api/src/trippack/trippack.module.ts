import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MapsModule } from '../maps/maps.module';
import { PoiModule } from '../poi/poi.module';

import { TripPackController } from './trippack.controller';

@Module({
  imports: [AuthModule, MapsModule, PoiModule],
  controllers: [TripPackController],
})
export class TripPackModule {}
