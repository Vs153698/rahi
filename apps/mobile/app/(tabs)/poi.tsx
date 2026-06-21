import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { POI_CATEGORIES, type PoiCategory } from '@rahi/shared';

import { poiRepository, type CorridorPoi } from '../../src/features/poi/poi.repository';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

const FILTERS: PoiCategory[] = ['fuel', 'mechanic', 'puncture', 'hospital', 'atm', 'police', 'food', 'dhaba', 'homestay'];

/**
 * Offline POI browse + nearest-X (Task 3.3). Corridor POIs for the active trip,
 * filterable by category, with a "nearest fuel" shortcut — all from local SQLite,
 * works with no signal. Gated behind the `pro` entitlement (stub until Phase 5).
 */
export default function PoiScreen() {
  const userId = useSession((s) => s.userId);
  const { status } = useEntitlement('pro');
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [category, setCategory] = useState<PoiCategory | null>(null);
  const [pois, setPois] = useState<(CorridorPoi & { distanceM?: number })[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (!trip) return;
    poiRepository
      .listForTrip(trip.id, { isPro: status.active, category: category ?? undefined })
      .then((rows) => {
        setPois(rows);
        setNote(rows.length === 0 ? 'No POIs cached for this route yet.' : null);
      })
      .catch((e) => setNote(e instanceof Error ? e.message : 'Could not load POIs'));
  }, [trip, category, status.active]);

  async function nearestFuel() {
    if (!trip) return;
    setNote(null);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const rows = await poiRepository.nearest(
        trip.id,
        { lng: loc.coords.longitude, lat: loc.coords.latitude },
        'fuel',
        { isPro: status.active, limit: 5 },
      );
      setCategory('fuel');
      setPois(rows);
      if (rows.length === 0) setNote('No fuel cached nearby.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Location unavailable');
    }
  }

  if (!status.active) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>🔒 Offline POIs are Pro</Text>
        <Text style={styles.lockedBody}>
          Fuel, mechanics and help along your route — cached for the dead zones. Unlocks with Rahi Pro.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <Chip label="All" active={category === null} onPress={() => setCategory(null)} />
        {FILTERS.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.nearest} onPress={nearestFuel}>
        <Text style={styles.nearestText}>⛽ Nearest fuel</Text>
      </TouchableOpacity>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <FlatList
        data={pois}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name ?? item.category}</Text>
            <Text style={styles.meta}>
              {item.category}
              {item.distanceM != null
                ? ` · ${(item.distanceM / 1000).toFixed(1)} km`
                : item.distance_from_route_m != null
                  ? ` · ${Math.round(item.distance_from_route_m)} m off route`
                  : ''}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg, padding: 12 },
  filters: { flexGrow: 0, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: lightTheme.bgRaised,
    marginRight: 8,
  },
  chipActive: { backgroundColor: lightTheme.primary },
  chipText: { color: lightTheme.textSoft, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  nearest: { backgroundColor: palette.gold, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 8 },
  nearestText: { color: palette.ink, fontWeight: '700' },
  note: { color: lightTheme.textMuted, marginVertical: 8, textAlign: 'center' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: lightTheme.border },
  name: { fontSize: 16, color: lightTheme.text, fontWeight: '600' },
  meta: { fontSize: 13, color: lightTheme.textMuted, marginTop: 2 },
  locked: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: lightTheme.bg },
  lockedTitle: { fontSize: 22, fontWeight: '700', color: lightTheme.text, marginBottom: 8 },
  lockedBody: { fontSize: 15, color: lightTheme.textSoft },
});
