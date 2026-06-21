import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SYNC_TABLES } from '@rahi/shared';

import { db } from '../../src/db/powersync';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { canUseAdvancedSafety } from '../../src/safety/gate';
import { openEmergencyDialer, triggerSos } from '../../src/safety/sos';
import { startCrashDetection, type CrashDetectorHandle } from '../../src/sensors/crashDetector';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

/**
 * Safety tab (Phase 6). Manual SOS is the FREE floor and always present. Crash
 * auto-detect (and the other proactive features) are Pro. Any SOS shows a
 * cancellable countdown — we never fire silently and never promise delivery.
 */
export default function SafetyScreen() {
  const userId = useSession((s) => s.userId);
  const { status } = useEntitlement('pro');
  const isPro = status.active;
  const [crashOn, setCrashOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const detector = useRef<CrashDetectorHandle | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      detector.current?.stop();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function beginCountdown(kind: 'manual' | 'crash_detected') {
    setCountdown(10);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          void fireSos(kind);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }

  function cancelCountdown() {
    if (timer.current) clearInterval(timer.current);
    setCountdown(null);
  }

  async function fireSos(kind: 'manual' | 'crash_detected') {
    const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
    const contacts = await db.getAll<{ phone: string }>(
      `SELECT phone FROM ${SYNC_TABLES.emergency_contacts} WHERE owner_id = ? AND deleted_at IS NULL`,
      [userId],
    );
    await triggerSos({
      ownerId: userId!,
      tripId: null,
      riderName: 'Rider',
      lat: loc?.coords.latitude ?? 0,
      lng: loc?.coords.longitude ?? 0,
      kind,
      contactPhones: contacts.map((c) => c.phone),
    });
    Alert.alert('SOS sent', 'Your contacts have been notified and a cloud alert is queued.');
  }

  function toggleCrash() {
    if (!canUseAdvancedSafety(isPro)) return;
    if (crashOn) {
      detector.current?.stop();
      detector.current = null;
      setCrashOn(false);
    } else {
      detector.current = startCrashDetection(() => beginCountdown('crash_detected'));
      setCrashOn(true);
    }
  }

  return (
    <View style={styles.container}>
      {countdown !== null ? (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownNum}>{countdown}</Text>
          <Text style={styles.countdownLabel}>Sending SOS…</Text>
          <TouchableOpacity style={styles.cancel} onPress={cancelCountdown}>
            <Text style={styles.cancelText}>Cancel — I'm OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.sos} onPress={() => beginCountdown('manual')}>
        <Text style={styles.sosText}>SOS</Text>
        <Text style={styles.sosSub}>Hold for help · Free</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.emergency} onPress={() => void openEmergencyDialer()}>
        <Text style={styles.emergencyText}>Call 112 (emergency services)</Text>
      </TouchableOpacity>

      <View style={styles.advanced}>
        <Text style={styles.advHeader}>Proactive safety {isPro ? '' : '· Pro'}</Text>
        <Row label="Crash auto-detect" on={crashOn} disabled={!isPro} onPress={toggleCrash} />
        <Text style={styles.note}>
          {isPro
            ? 'Fuel-range, daylight, beacon and dead-man check-in run during a ride.'
            : 'Upgrade to Pro for crash detection, fuel-range, daylight, beacon and dead-man check-in.'}
        </Text>
      </View>
    </View>
  );
}

function Row({ label, on, disabled, onPress }: { label: string; on: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.row, disabled && styles.rowDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowState, on && styles.rowOn]}>{disabled ? '🔒' : on ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg, padding: 20, gap: 16 },
  sos: { backgroundColor: palette.alert, borderRadius: 999, paddingVertical: 36, alignItems: 'center', marginTop: 12 },
  sosText: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  sosSub: { color: '#fff', marginTop: 4, opacity: 0.9 },
  emergency: { borderWidth: 1, borderColor: palette.alert, borderRadius: 12, padding: 14, alignItems: 'center' },
  emergencyText: { color: palette.alert, fontWeight: '700' },
  advanced: { marginTop: 8, gap: 8 },
  advHeader: { fontSize: 16, fontWeight: '700', color: lightTheme.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 10, backgroundColor: lightTheme.bgRaised },
  rowDisabled: { opacity: 0.6 },
  rowLabel: { color: lightTheme.text, fontSize: 15 },
  rowState: { color: lightTheme.textMuted, fontWeight: '700' },
  rowOn: { color: palette.trail },
  note: { color: lightTheme.textMuted, fontSize: 13 },
  countdownBox: { backgroundColor: palette.alertSoft, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  countdownNum: { fontSize: 44, fontWeight: '900', color: palette.alert },
  countdownLabel: { color: palette.alert, fontWeight: '600' },
  cancel: { backgroundColor: lightTheme.text, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12, marginTop: 6 },
  cancelText: { color: '#fff', fontWeight: '700' },
});
