import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { GraphHopperClient } from './graphhopper.client';
import { RoutesRepository } from './routes.repository';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
  imports: [AuthModule],
  controllers: [RoutingController],
  providers: [GraphHopperClient, RoutesRepository, RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
