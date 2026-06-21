import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RahiMap } from '../../src/maps';
import { isRecording, startRecording, stopRecording } from '../../src/location/trackRecorder';
import { tracksRepository } from '../../src/db/repositories/tracks.repository';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

/**
 * Map tab (Task 2.1/2.4). Renders the map (online raster fallback until a pro
 * offline pack is downloaded) and a record toggle that captures the ride track
 * offline. Replays the recorded breadcrumbs as a polyline.
 */
export default function MapScreen() {
  const userId = useSession((s) => s.userId);
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [recording, setRecording] = useState(isRecording());
  const [track, setTrack] = useState<[number, number][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (trip) void tracksRepository.getTrack(trip.id).then(setTrack);
  }, [trip, recording]);

  async function toggleRecording() {
    setError(null);
    try {
      if (!trip) {
        setError('Create a trip first to record a track.');
        return;
      }
      if (recording) {
        await stopRecording();
        setRecording(false);
        setTrack(await tracksRepository.getTrack(trip.id));
      } else {
        await startRecording(trip.id);
        setRecording(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not toggle recording');
    }
  }

  return (
    <View style={styles.container}>
      <RahiMap trackLine={track} />

      <View style={styles.controls} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={toggleRecording}
        >
          <Text style={styles.recordText}>{recording ? '■ Stop recording' : '● Record ride'}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg },
  controls: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center', gap: 8 },
  recordBtn: {
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  recordBtnActive: { backgroundColor: palette.alert },
  recordText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: palette.alert, backgroundColor: 'rgba(252,251,248,0.9)', padding: 6, borderRadius: 6 },
});
