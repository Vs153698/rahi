import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

export interface AuthenticatedUser {
  id: string;
  phone?: string;
}

/**
 * Verifies the Supabase-issued JWT on incoming requests and attaches the user
 * to `req.user`. We verify via Supabase Auth (`getUser`) so revocation and
 * expiry are honoured server-side; RLS still applies on the data path
 * (rahi-docs/10).
 *
 * Phase 0: if Supabase isn't configured this guard rejects (fail-closed) so we
 * never accidentally treat an unprovisioned environment as authenticated.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    }>();

    const header = req.headers['authorization'] ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    if (!this.supabase.isConfigured) {
      throw new UnauthorizedException('Auth backend not configured');
    }

    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    req.user = { id: data.user.id, phone: data.user.phone ?? undefined };
    return true;
  }
}
