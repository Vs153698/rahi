import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from './env.schema';

/**
 * Typed accessor over the validated env. Inject this instead of reading
 * `process.env` directly so every consumer gets type-safety and the validated
 * values.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<T extends keyof Env>(key: T): Env[T] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /** True only when all Supabase vars are present (Phase 0 may run without them). */
  get hasSupabase(): boolean {
    return Boolean(this.get('SUPABASE_URL') && this.get('SUPABASE_SERVICE_ROLE_KEY'));
  }
}
