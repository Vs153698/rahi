import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { PACKING_CHECKLIST, PERMIT_ZONES } from '@rahi/shared';

import { getCheckedIds, toggleItem } from '../../src/features/checklists/checklists';
import { listDocuments, unlockVault } from '../../src/features/vault/vault';
import { oneTapTripPack } from '../../src/features/trippack/trippack';
import { useConnectivity } from '../../src/sync/connectivity';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useSession } from '../../src/state/session';
import { lightTheme } from '../../src/theme/tokens';

/**
 * Prep tab (Phase 9, Pro). One-tap trip pack, packing checklist + restricted-zone
 * permits (offline), and the document vault entry. All offline-ready.
 */
export default function PrepScreen() {
  const userId = useSession((s) => s.userId);
  const online = useConnectivity((s) => s.online);
  const { status } = useEntitlement('pro');
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [packing, setPacking] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (trip) void getCheckedIds(trip.id).then(setChecked);
  }, [trip]);

  async function runTripPack() {
    if (!trip) return setPackMsg('Create a trip first.');
    setPacking(true);
    setPackMsg(null);
    try {
      const res = await oneTapTripPack({
        tripId: trip.id,
        isPro: status.active,
        start: { lng: 77.59, lat: 12.97 },
        onWifi: online,
        onProgress: (p) => setPackMsg(`${p.step}… ${Math.round(p.fraction * 100)}%`),
      });
      setPackMsg(`Packed ${res.tilePacks} tile pack(s), ${res.forecastDays}-day forecast.`);
    } catch (e) {
      setPackMsg(e instanceof Error ? e.message : 'Trip pack failed');
    } finally {
      setPacking(false);
    }
  }

  async function openVault() {
    const ok = await unlockVault();
    if (!ok) return Alert.alert('Locked', 'Vault stays locked.');
    setDocCount((await listDocuments(userId!)).length);
  }

  async function toggle(itemId: string, value: boolean) {
    if (!trip) return;
    await toggleItem(trip.id, itemId, value);
    setChecked(await getCheckedIds(trip.id));
  }

  if (!status.active) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>🔒 Trip prep is Pro</Text>
        <Text style={styles.lockedBody}>One-tap trip pack, encrypted document vault, checklists and permit info — all offline.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Section title="Trip pack">
        <TouchableOpacity style={styles.cta} onPress={runTripPack} disabled={packing}>
          <Text style={styles.ctaText}>{packing ? 'Packing…' : '⬇ One-tap download'}</Text>
        </TouchableOpacity>
        {packMsg ? <Text style={styles.muted}>{packMsg}</Text> : null}
      </Section>

      <Section title="Document vault">
        <TouchableOpacity style={styles.secondary} onPress={openVault}>
          <Text style={styles.secondaryText}>🔐 Unlock vault</Text>
        </TouchableOpacity>
        {docCount != null ? <Text style={styles.muted}>{docCount} document(s) stored.</Text> : null}
      </Section>

      <Section title={`Packing checklist (${checked.size}/${PACKING_CHECKLIST.length})`}>
        {PACKING_CHECKLIST.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Switch value={checked.has(item.id)} onValueChange={(v) => void toggle(item.id, v)} />
          </View>
        ))}
      </Section>

      <Section title="Permits & inner-line">
        {PERMIT_ZONES.map((z) => (
          <View key={z.id} style={styles.permit}>
            <Text style={styles.permitRegion}>{z.region}</Text>
            <Text style={styles.muted}>{z.summary}</Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg },
  section: { gap: 8 },
  h: { fontSize: 17, fontWeight: '700', color: lightTheme.text },
  muted: { color: lightTheme.textMuted, fontSize: 13 },
  cta: { backgroundColor: lightTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: lightTheme.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  secondaryText: { color: lightTheme.text, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: lightTheme.border },
  rowLabel: { color: lightTheme.text, flex: 1 },
  permit: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: lightTheme.border },
  permitRegion: { color: lightTheme.text, fontWeight: '600' },
  locked: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: lightTheme.bg },
  lockedTitle: { fontSize: 22, fontWeight: '700', color: lightTheme.text, marginBottom: 8 },
  lockedBody: { fontSize: 15, color: lightTheme.textSoft },
});
