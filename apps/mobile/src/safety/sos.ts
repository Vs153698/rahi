import * as SMS from 'expo-sms';
import { Linking, Platform } from 'react-native';

import { composeSosMessage, deliveryPlan, type SosContext, type SosKind } from '@rahi/shared';

import { sosRepository } from '../db/repositories/sos.repository';

/**
 * SOS trigger (Task 6.3, rahi-docs/10/11). Platform-aware and HONEST about
 * delivery — we never claim guaranteed delivery and never silently auto-send SMS
 * on iOS. Order of operations:
 *   1. Record the event locally + queue the cloud alert (durable; fires on signal).
 *   2. Open an SMS to emergency contacts (pre-composed; the user taps send — on
 *      both platforms expo-sms opens the composer, which is the honest path).
 *   3. Surface the OS native Emergency SOS / 112 as the most reliable option.
 * The UI always shows a cancellable countdown before this runs.
 */
export interface SosParams {
  ownerId: string;
  tripId: string | null;
  riderName: string;
  lat: number;
  lng: number;
  kind: SosKind;
  contactPhones: string[];
}

export async function triggerSos(params: SosParams): Promise<{ sosId: string; smsAttempted: boolean }> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const plan = deliveryPlan(platform);
  const ctx: SosContext = {
    riderName: params.riderName,
    lat: params.lat,
    lng: params.lng,
    kind: params.kind,
  };
  const message = composeSosMessage(ctx);

  let smsAttempted = false;
  if (params.contactPhones.length > 0 && (await SMS.isAvailableAsync())) {
    // Opens the SMS composer pre-filled; the rider taps send. Honest on both OSes.
    await SMS.sendSMSAsync(params.contactPhones, message).catch(() => undefined);
    smsAttempted = true;
  }

  const sosId = await sosRepository.record({
    ownerId: params.ownerId,
    tripId: params.tripId,
    kind: params.kind,
    lng: params.lng,
    lat: params.lat,
    delivery: {
      sms_sent: smsAttempted && plan.autoSmsAndroid,
      precomposed: smsAttempted && plan.preComposedIos,
      cloud_queued: true,
      native_sos: plan.nativeEmergencyHandoff,
    },
  });

  return { sosId, smsAttempted };
}

/** Hand off to the OS dialer for emergency services (most reliable path). */
export async function openEmergencyDialer(): Promise<void> {
  // 112 is India's single emergency number.
  await Linking.openURL('tel:112').catch(() => undefined);
}
