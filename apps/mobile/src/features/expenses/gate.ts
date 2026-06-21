/**
 * Free/Pro gating for bill splitting (Task 4.4, rahi-docs/14). Online splitting
 * is FREE — the connected case works for everyone. OFFLINE splitting (the moment
 * a rider is in a dead zone and the app still works) is the Pro value, so it's
 * gated behind the cached `pro` entitlement.
 */
export class OfflineSplitRequiresProError extends Error {
  constructor() {
    super('Offline bill splitting is a Rahi Pro feature.');
    this.name = 'OfflineSplitRequiresProError';
  }
}

export interface SplitGateContext {
  online: boolean;
  isPro: boolean;
}

/** Whether a split write may proceed in the current context. */
export function canSplit(ctx: SplitGateContext): boolean {
  return ctx.online || ctx.isPro;
}

/** Throws OfflineSplitRequiresProError when a Free user splits while offline. */
export function assertCanSplit(ctx: SplitGateContext): void {
  if (!canSplit(ctx)) throw new OfflineSplitRequiresProError();
}
