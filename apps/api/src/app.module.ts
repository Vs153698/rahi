import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthModule } from './health/health.module';
import { MapsModule } from './maps/maps.module';
import { PoiModule } from './poi/poi.module';
import { RoutingModule } from './routing/routing.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    HealthModule,
    AuthModule,
    TripsModule,
    ExpensesModule,
    MapsModule,
    RoutingModule,
    PoiModule,
  ],
})
export class AppModule {}
