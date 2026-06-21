import { Injectable } from '@nestjs/common';

import { mergeExpensePair, type MergeableExpense } from '@rahi/shared';

import type { RequestContext } from '../../common/auth-context';
import { BaseRepository } from '../../common/repositories/base.repository';
import { SupabaseService } from '../../supabase/supabase.service';

export interface ExpenseRow extends MergeableExpense {
  trip_id: string;
  group_id: string | null;
  amount_paise: number;
  note: string | null;
}

/**
 * Expenses repository. Writes are trip-access-scoped. When a write targets an
 * existing expense, the server applies the SAME CRDT merge as the client
 * (mergeExpensePair from @rahi/shared) so server- and device-side resolution are
 * byte-identical (rahi-docs/05 §4) — important when a write arrives via the API
 * path or webhook rather than PowerSync.
 */
@Injectable()
export class ExpensesRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async listForTrip(ctx: RequestContext, tripId: string): Promise<ExpenseRow[]> {
    await this.assertTripAccess(ctx, tripId);
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ExpenseRow[];
  }

  /**
   * Upsert with merge: if the row exists, resolve incoming vs stored via the
   * shared reducer and persist the winner. Pure CRDT semantics, so concurrent
   * API + sync writes converge.
   */
  async upsertMerged(ctx: RequestContext, incoming: ExpenseRow): Promise<ExpenseRow> {
    await this.assertTripAccess(ctx, incoming.trip_id);

    const { data: existing } = await this.db
      .from('expenses')
      .select('*')
      .eq('id', incoming.id)
      .maybeSingle<ExpenseRow>();

    const winner = existing ? (mergeExpensePair(existing, incoming) as ExpenseRow) : incoming;

    const { data, error } = await this.db
      .from('expenses')
      .upsert({ ...winner, created_by: winner.created_by ?? ctx.userId })
      .select('*')
      .single<ExpenseRow>();
    if (error) throw error;
    return data;
  }
}
