import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Note } from '@rahi/shared';

import { notesRepository } from '../../src/db/repositories/notes.repository';
import { useConnectivity } from '../../src/sync/connectivity';
import { useSession } from '../../src/state/session';

/**
 * Home — doubles as the Phase 0 sync demo. Create a note offline; it persists
 * locally immediately and syncs to Postgres when connectivity returns (the
 * reactive query re-renders on sync). Proves the offline-first round-trip.
 */
export default function HomeScreen() {
  const userId = useSession((s) => s.userId);
  const online = useConnectivity((s) => s.online);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => notesRepository.watchAll(setNotes), []);

  async function add() {
    if (!userId || draft.trim().length === 0) return;
    await notesRepository.create(userId, draft.trim());
    setDraft('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{online ? 'Online — syncing' : 'Offline — saved locally'}</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a note (works offline)"
        />
        <TouchableOpacity style={styles.add} onPress={add}>
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Text style={styles.note}>• {item.body}</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  status: { color: '#666', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  add: { backgroundColor: '#1f6feb', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '600' },
  note: { fontSize: 16, paddingVertical: 6 },
  empty: { color: '#999', marginTop: 24, textAlign: 'center' },
});
