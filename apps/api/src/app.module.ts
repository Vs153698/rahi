import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ConfigModule } from './config/config.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthModule } from './health/health.module';
import { MapsModule } from './maps/maps.module';
import { PaymentsModule } from './payments/payments.module';
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
    BillingModule,
    PaymentsModule,
  ],
})
export class AppModule {}
