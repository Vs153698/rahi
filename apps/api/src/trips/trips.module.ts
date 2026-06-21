import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { TripsController } from './trips.controller';
import { TripsRepository } from './repositories/trips.repository';

@Module({
  imports: [AuthModule],
  controllers: [TripsController],
  providers: [TripsRepository],
  exports: [TripsRepository],
})
export class TripsModule {}
