import { Controller, Delete, HttpCode, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';
import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Account deletion (Task 11.2/11.3, rahi-docs/10). Required for DPDP and for
 * store subscription review (subscribers must be able to delete their account
 * in-app). Deletes the auth user; owned rows cascade via FK `on delete cascade`
 * (rahi-docs/04). The subscription itself must be cancelled in the store
 * (surfaced via the manage-subscription link) — deleting the account here does
 * not refund or cancel store billing.
 */
class AccountRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async deleteUser(userId: string): Promise<void> {
    // Service-role admin delete removes the auth user; FK cascades clear data.
    const { error } = await this.db.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  private readonly repo: AccountRepository;
  constructor(supabase: SupabaseService) {
    this.repo = new AccountRepository(supabase);
  }

  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() ctx: RequestContext): Promise<void> {
    await this.repo.deleteUser(ctx.userId);
  }
}
