/**
 * The authenticated caller's context, derived from the verified Supabase JWT by
 * JwtAuthGuard. Repositories take this so every query is scoped to the user and
 * their groups — the server never trusts a client-supplied owner_id.
 */
export interface RequestContext {
  userId: string;
}
