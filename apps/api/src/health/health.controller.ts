import { Controller, Get } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

interface HealthResponse {
  status: 'ok';
  service: 'rahi-api';
  time: string;
  checks: {
    supabase: 'configured' | 'not-configured';
    postgis: 'present' | 'absent' | 'unknown';
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Liveness + lightweight readiness. Always 200 with a body describing what's
   * wired. In Phase 0 (no Supabase yet) it reports degraded checks rather than
   * failing, so the app can boot before provisioning (rahi-docs/12 §2).
   */
  @Get()
  async check(): Promise<HealthResponse> {
    let postgis: HealthResponse['checks']['postgis'] = 'unknown';

    if (this.supabase.isConfigured) {
      try {
        // Confirms the PostGIS extension is installed (migration 0000).
        const { data, error } = await this.supabase.client
          .rpc('postgis_version')
          .single<string>();
        postgis = !error && data ? 'present' : 'absent';
      } catch {
        postgis = 'absent';
      }
    }

    return {
      status: 'ok',
      service: 'rahi-api',
      time: new Date().toISOString(),
      checks: {
        supabase: this.supabase.isConfigured ? 'configured' : 'not-configured',
        postgis,
      },
    };
  }
}
