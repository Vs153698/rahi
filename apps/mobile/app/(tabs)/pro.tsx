import { StyleSheet, Text, View } from 'react-native';

import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { Paywall } from '../../src/entitlement/paywall/Paywall';
import { useSession } from '../../src/state/session';

/**
 * Pro-only placeholder gated by `useEntitlement('pro')` (Task 0.8). In Phase 0
 * the entitlement resolves to false (stub), so this shows the locked state.
 * Phase 5 replaces the locked state with the real contextual paywall.
 * Entitlement read works fully offline (grace applied — rahi-docs/05, /09).
 */
export default function ProScreen() {
  const { status, loading } = useEntitlement('pro');
  const signOut = useSession((s) => s.signOut);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Checking your subscription…</Text>
      </View>
    );
  }

  if (status.active) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You're Pro ✓</Text>
        {status.inGrace ? (
          <Text style={styles.grace}>Offline grace active until {status.expiresAt}</Text>
        ) : null}
        <Text style={styles.body}>The offline suite is unlocked.</Text>
        <Text style={styles.signout} onPress={() => void signOut()}>
          Sign out
        </Text>
      </View>
    );
  }

  // Real contextual paywall (Phase 5). onUnlocked re-resolves via the hook.
  return <Paywall onUnlocked={() => undefined} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 16, color: '#444' },
  grace: { fontSize: 13, color: '#b8860b' },
  locked: { marginTop: 16, color: '#888' },
  signout: { marginTop: 32, color: '#1f6feb' },
});
