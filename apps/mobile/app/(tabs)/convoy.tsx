import MapLibreGL from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { SYNC_TABLES } from '@rahi/shared';

import { RahiMap } from '../../src/maps';
import { convoyRepository, type ConvoyMember } from '../../src/features/convoy/convoy.repository';
import { findLostMembers } from '../../src/features/convoy/lostMember';
import { createGroup, joinGroupByCode } from '../../src/features/group/group.repository';
import { db } from '../../src/db/powersync';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

const roleColor = (role: string): string =>
  role === 'lead' ? palette.amber : role === 'sweep' ? palette.slate : palette.trail;

/**
 * Convoy tab (Phase 7, Pro). Renders the group's members on the map with their
 * roles, flags lost members, and supports creating/joining a group by code.
 * Online-first; Phase 8 mesh keeps it alive off-grid.
 */
export default function ConvoyScreen() {
  const userId = useSession((s) => s.userId);
  const { status } = useEntitlement('pro');
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<ConvoyMember[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (!trip) return;
    void db
      .getAll<{ id: string }>(`SELECT id FROM ${SYNC_TABLES.groups} WHERE trip_id = ? LIMIT 1`, [trip.id])
      .then((g) => setGroupId(g[0]?.id ?? null));
  }, [trip]);

  useEffect(() => {
    if (!groupId) return;
    return convoyRepository.watchMembers(groupId, setMembers);
  }, [groupId]);

  const lost = findLostMembers(members);

  if (!status.active) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>🔒 Convoy is Pro</Text>
        <Text style={styles.lockedBody}>See your whole group on the map, with roles and regroup pins — even off the grid (Phase 8 mesh).</Text>
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={styles.setup}>
        <Text style={styles.h}>Ride together</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            setError(null);
            if (!trip) return setError('Create a trip first.');
            try {
              const g = await createGroup(trip.id, `${trip.title} convoy`);
              setGroupId(g.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not create group');
            }
          }}
        >
          <Text style={styles.btnText}>Create a convoy</Text>
        </TouchableOpacity>

        <Text style={styles.or}>or join with a code</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABC234" />
          <TouchableOpacity
            style={styles.btnSm}
            onPress={async () => {
              setError(null);
              try {
                const g = await joinGroupByCode(code);
                setGroupId(g.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not join');
              }
            }}
          >
            <Text style={styles.btnText}>Join</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lost.length > 0 ? (
        <View style={styles.lostBanner}>
          <Text style={styles.lostText}>⚠️ {lost.length} rider(s) out of contact</Text>
        </View>
      ) : null}
      <RahiMap>
        {members
          .filter((m) => m.lng != null && m.lat != null)
          .map((m) => (
            <MapLibreGL.PointAnnotation key={m.member_id} id={m.member_id} coordinate={[m.lng as number, m.lat as number]}>
              <View style={[styles.marker, { backgroundColor: roleColor(m.role) }]}>
                <Text style={styles.markerText}>{m.role[0]?.toUpperCase()}</Text>
              </View>
            </MapLibreGL.PointAnnotation>
          ))}
      </RahiMap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  markerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  lostBanner: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, backgroundColor: palette.alert, borderRadius: 10, padding: 10 },
  lostText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  setup: { flex: 1, padding: 24, gap: 12, justifyContent: 'center', backgroundColor: lightTheme.bg },
  h: { fontSize: 24, fontWeight: '800', color: lightTheme.text, marginBottom: 8 },
  btn: { backgroundColor: lightTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSm: { backgroundColor: lightTheme.primary, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  or: { color: lightTheme.textMuted, textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: lightTheme.border, borderRadius: 8, padding: 12, letterSpacing: 2 },
  error: { color: palette.alert, textAlign: 'center', marginTop: 8 },
  locked: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: lightTheme.bg },
  lockedTitle: { fontSize: 22, fontWeight: '700', color: lightTheme.text, marginBottom: 8 },
  lockedBody: { fontSize: 15, color: lightTheme.textSoft },
});
