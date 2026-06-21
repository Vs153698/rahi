import { create } from 'zustand';

import { connectSync, disconnectSync } from '../db/powersync';

type Online = boolean;

interface ConnectivityState {
  online: Online;
  setOnline: (online: Online) => void;
}

/**
 * Connectivity signal. Phase 0 keeps this minimal — a store other layers read
 * and a setter wired to a network listener. When the device comes online we
 * best-effort connect PowerSync; when it drops we disconnect so the local DB
 * keeps serving reads (the app stays usable — rahi-docs/05).
 *
 * Phase 1 replaces the manual setter with `@react-native-community/netinfo` and
 * adds the coverage-aware queue (rahi-docs/05, /07).
 */
export const useConnectivity = create<ConnectivityState>((set) => ({
  online: false,
  setOnline: (online) => {
    set({ online });
    if (online) {
      void connectSync();
    } else {
      void disconnectSync();
    }
  },
}));

/**
 * Probe connectivity by pinging our API /health. Cheap, offline-safe (failure
 * just means offline). Call on app focus / interval in Phase 1.
 */
export async function probeOnline(apiBaseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
