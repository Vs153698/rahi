import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/i18n';
import { configureRevenueCat } from '../src/entitlement/revenuecat';
import { openDatabase } from '../src/db/powersync';
import { initSentry } from '../src/monitoring/sentry';
import { useSession } from '../src/state/session';

initSentry();

/**
 * Root layout. Cold-start order is deliberate (Task 0.7): open the local DB and
 * load the persisted session WITHOUT awaiting the network, so the app is usable
 * offline immediately. Connectivity-dependent work (sync connect, token refresh,
 * RevenueCat) happens opportunistically and never blocks the first paint.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const status = useSession((s) => s.status);
  const bootstrap = useSession((s) => s.bootstrap);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      await openDatabase(); // local-only, offline-safe
      await bootstrap(); // reads persisted session from keychain, no network
      void configureRevenueCat(); // stub no-op in Phase 0
      setReady(true);
    })();
  }, [bootstrap]);

  // Route guard: send unauthenticated users to (auth), authenticated to (tabs).
  useEffect(() => {
    if (!ready || status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, status, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
