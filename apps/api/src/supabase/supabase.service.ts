import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { AppConfigService } from '../config/app-config.service';

/**
 * Server-side Supabase access using the service-role key. Region: Mumbai
 * (ap-south-1) for DPDP data residency (rahi-docs/01 §5, /10).
 *
 * NOTE: this is the privileged client and bypasses RLS — only use it inside
 * repositories/services that have already authorised the caller. User-scoped
 * reads should still go through RLS-aware paths (rahi-docs/10).
 *
 * Phase 0: if Supabase isn't provisioned yet, `client` is null and dependents
 * degrade gracefully (e.g. /health reports it as not-configured).
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly _client: SupabaseClient | null;

  constructor(private readonly config: AppConfigService) {
    if (!this.config.hasSupabase) {
      this.logger.warn(
        'Supabase not configured (SUPABASE_URL / SERVICE_ROLE_KEY missing). ' +
          'Running in Phase-0 degraded mode. // verify provisioning',
      );
      this._client = null;
      return;
    }

    this._client = createClient(
      this.config.get('SUPABASE_URL') as string,
      this.config.get('SUPABASE_SERVICE_ROLE_KEY') as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  get isConfigured(): boolean {
    return this._client !== null;
  }

  /** Throws if accessed before Supabase is provisioned. */
  get client(): SupabaseClient {
    if (!this._client) {
      throw new Error('Supabase client requested but not configured.');
    }
    return this._client;
  }
}
