import type { MeshEnvelope } from '@rahi/shared';

import type { MeshPeer, MeshTransport, MeshTransportEvents } from '../transport';

/**
 * Bridgefy transport adapter (rahi-docs/06 §3 Option A — the V1 candidate). BLE
 * Bluetooth mesh with built-in discovery/relay/encryption (Signal Protocol),
 * cross-platform via `bridgefy-react-native`.
 *
 * Spike-gated: `available` stays false until the SDK is integrated AND the
 * commercial licensing is resolved (pricing isn't public — rahi-docs/06 §3, /13).
 * Until then the engine falls back to online-first. The method bodies show where
 * the SDK calls go so wiring is a small, contained change post-spike.
 */
export class BridgefyTransport implements MeshTransport {
  readonly name = 'bridgefy' as const;
  // Flip to true once the SDK + license land and Spike-M passes.
  readonly available = false;

  async start(_groupId: string, _selfId: string, _events: MeshTransportEvents): Promise<void> {
    // TODO(spike-m): Bridgefy.initialize({ apiKey }); start(); subscribe to
    // onMessageReceived → events.onMessage(decoded, senderId);
    // onConnected/onDisconnected → events.onPeerFound/onPeerLost.
    throw new Error('Bridgefy transport not enabled (Spike-M pending)');
  }

  async stop(): Promise<void> {
    /* TODO(spike-m): Bridgefy.stop() */
  }

  async broadcast(_env: MeshEnvelope): Promise<number> {
    // TODO(spike-m): Bridgefy.send(JSON, { transmissionMode: 'mesh' })
    return 0;
  }

  peers(): MeshPeer[] {
    return [];
  }
}
