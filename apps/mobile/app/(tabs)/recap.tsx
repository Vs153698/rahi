import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RideStats } from '@rahi/shared';

import { listBadges, type EarnedBadge } from '../../src/features/badges/badges';
import { computeLocalRecap, generateRecap } from '../../src/features/recap/recap';
import { startAltitudeMonitor, type AltitudeStatus } from '../../src/features/altitude/altitude';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

/**
 * Recap tab (Phase 10, Pro). Post-ride stats + badges from the track, plus a live
 * altitude/AMS/storm card from the barometer. The recap render is server-side;
 * stats are computed offline (deterministic shared math).
 */
export default function RecapScreen() {
  const userId = useSession((s) => s.userId);
  const { status } = useEntitlement('pro');
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [stats, setStats] = useState<RideStats | null>(null);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [alt, setAlt] = useState<AltitudeStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (userId) void listBadges(userId).then(setBadges);
  }, [userId]);

  useEffect(() => {
    const handle = startAltitudeMonitor(setAlt);
    return () => handle.stop();
  }, []);

  async function buildRecap() {
    if (!trip) return setMsg('No trip to recap.');
    setMsg('Computing…');
    const local = await computeLocalRecap(trip.id);
    setStats(local.stats);
    const res = await generateRecap(trip.id);
    setMsg(res ? 'Recap saved + poster queued.' : 'Computed offline — will render when online.');
    if (userId) setBadges(await listBadges(userId));
  }

  if (!status.active) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>🔒 Recap is Pro</Text>
        <Text style={styles.lockedBody}>A shareable poster of your ride, milestone badges, and an altitude/AMS profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {alt ? (
        <View style={[styles.card, (alt.ams.warn || alt.storm) && styles.cardAlert]}>
          <Text style={styles.cardH}>Altitude {alt.altitudeM} m</Text>
          <Text style={styles.muted}>Pressure {alt.pressureHpa} hPa</Text>
          {alt.ams.warn ? <Text style={styles.warn}>⚠️ {alt.ams.reason}</Text> : null}
          {alt.storm ? <Text style={styles.warn}>🌧️ Pressure dropping fast — storm may be approaching.</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.cta} onPress={buildRecap}>
        <Text style={styles.ctaText}>Generate ride recap</Text>
      </TouchableOpacity>
      {msg ? <Text style={styles.muted}>{msg}</Text> : null}

      {stats ? (
        <View style={styles.card}>
          <Text style={styles.cardH}>This ride</Text>
          <Stat label="Distance" value={`${stats.distanceKm} km`} />
          <Stat label="Max altitude" value={stats.maxAltitudeM != null ? `${stats.maxAltitudeM} m` : '—'} />
          <Stat label="Elevation gain" value={`${stats.elevationGainM} m`} />
          <Stat label="Longest day" value={`${stats.longestDayKm} km`} />
          <Stat label="States crossed" value={String(stats.statesCrossed)} />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardH}>Badges ({badges.length})</Text>
        <View style={styles.badgeWrap}>
          {badges.length === 0 ? (
            <Text style={styles.muted}>Ride high passes and long days to earn badges.</Text>
          ) : (
            badges.map((b) => (
              <View key={b.id} style={styles.badge}>
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg },
  cta: { backgroundColor: lightTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: lightTheme.bgRaised, borderRadius: 14, padding: 16, gap: 6 },
  cardAlert: { borderWidth: 1, borderColor: palette.alert },
  cardH: { fontSize: 16, fontWeight: '700', color: lightTheme.text },
  muted: { color: lightTheme.textMuted, fontSize: 13 },
  warn: { color: palette.alert, fontWeight: '600', marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statValue: { color: lightTheme.text, fontWeight: '700' },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { backgroundColor: palette.goldSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: palette.amber2, fontWeight: '700', fontSize: 12 },
  locked: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: lightTheme.bg },
  lockedTitle: { fontSize: 22, fontWeight: '700', color: lightTheme.text, marginBottom: 8 },
  lockedBody: { fontSize: 15, color: lightTheme.textSoft },
});
