import type { MeshEnvelope } from '@rahi/shared';

import type { MeshPeer, MeshTransport, MeshTransportEvents } from '../transport';

/**
 * Native P2P transport adapter (rahi-docs/06 §3 Option B — the free fallback):
 * iOS **Multipeer Connectivity** + Android **Nearby Connections** behind one JS
 * interface, with libsodium group-key encryption layered on (rahi-docs/06 §5).
 *
 * Requires a custom native module (`apps/mobile/native/*`) — real effort, and the
 * cross-OS iOS↔Android link is the make-or-break the spike must prove. `available`
 * stays false until that native module exists and Spike-M passes.
 */
export class NativeP2PTransport implements MeshTransport {
  readonly name = 'native-p2p' as const;
  readonly available = false;

  async start(_groupId: string, _selfId: string, _events: MeshTransportEvents): Promise<void> {
    // TODO(spike-m): NativeModules.RahiMesh.start(groupKey); bridge native
    // discovery/relay callbacks → events.*; decrypt payloads with the group key.
    throw new Error('Native P2P transport not enabled (Spike-M pending)');
  }

  async stop(): Promise<void> {
    /* TODO(spike-m): NativeModules.RahiMesh.stop() */
  }

  async broadcast(_env: MeshEnvelope): Promise<number> {
    return 0;
  }

  peers(): MeshPeer[] {
    return [];
  }
}
