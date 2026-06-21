/**
 * SOS message composition + delivery policy (Task 6.3, rahi-docs/10/11). Pure
 * helpers; the actual sending is platform-specific in the app. We NEVER claim
 * guaranteed delivery and never auto-send SMS on iOS (we pre-compose and the user
 * taps send).
 */
export type SosKind = 'crash_detected' | 'manual' | 'deadman_timeout';

export interface SosContext {
  riderName: string;
  lat: number;
  lng: number;
  kind: SosKind;
}

/** A short SMS-friendly message with a maps link. */
export function composeSosMessage(ctx: SosContext): string {
  const maps = `https://maps.google.com/?q=${ctx.lat.toFixed(5)},${ctx.lng.toFixed(5)}`;
  const reason =
    ctx.kind === 'crash_detected'
      ? 'A possible crash was detected.'
      : ctx.kind === 'deadman_timeout'
        ? "I haven't checked in."
        : 'I need help.';
  return `SOS from ${ctx.riderName}. ${reason} Location: ${maps}`;
}

/** Per-platform delivery capabilities — drives honest UX (no false promises). */
export interface DeliveryPlan {
  /** Android can send a DLT-templated SMS programmatically (with permission). */
  autoSmsAndroid: boolean;
  /** iOS must use a pre-composed message the user taps to send. */
  preComposedIos: boolean;
  /** Always also queue a cloud alert (delivered when any signal returns). */
  cloudQueued: boolean;
  /** Offer the OS native Emergency SOS as the primary, most-reliable path. */
  nativeEmergencyHandoff: boolean;
}

export function deliveryPlan(platform: 'ios' | 'android'): DeliveryPlan {
  return {
    autoSmsAndroid: platform === 'android',
    preComposedIos: platform === 'ios',
    cloudQueued: true,
    nativeEmergencyHandoff: true,
  };
}
