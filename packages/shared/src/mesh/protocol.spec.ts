import {
  DEFAULT_TTL_HOPS,
  SeenCache,
  forwarded,
  handleIncoming,
  isValidEnvelope,
  makeEnvelope,
  shouldRelay,
  type MeshEnvelope,
} from './protocol';

const uuid = (n: number) => `00000000-0000-0000-0000-${n.toString().padStart(12, '0')}`;

function env(over: Partial<MeshEnvelope> = {}): MeshEnvelope {
  return makeEnvelope({
    msgId: over.msg_id ?? uuid(1),
    groupId: over.group_id ?? uuid(99),
    senderId: over.sender_id ?? 'n1',
    type: over.type ?? 'chat',
    payload: over.payload ?? { text: 'hi' },
    ttlHops: over.ttl_hops,
  });
}

describe('envelope', () => {
  it('builds and validates', () => {
    const e = env();
    expect(e.ttl_hops).toBe(DEFAULT_TTL_HOPS);
    expect(isValidEnvelope(e)).toBe(true);
    expect(isValidEnvelope({ ...e, type: 'nope' })).toBe(false);
  });
});

describe('SeenCache (dedup LRU)', () => {
  it('reports first-seen vs duplicate', () => {
    const c = new SeenCache(10);
    expect(c.markSeen('a')).toBe(false); // first time → process
    expect(c.markSeen('a')).toBe(true); // duplicate → drop
  });

  it('evicts oldest beyond capacity', () => {
    const c = new SeenCache(2);
    c.markSeen('a');
    c.markSeen('b');
    c.markSeen('c'); // evicts 'a'
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
  });
});

describe('relay / ttl', () => {
  it('decrements hops and stops at zero', () => {
    expect(shouldRelay(env({ ttl_hops: 1 }))).toBe(true);
    expect(shouldRelay(env({ ttl_hops: 0 }))).toBe(false);
    expect(forwarded(env({ ttl_hops: 3 })).ttl_hops).toBe(2);
    expect(forwarded(env({ ttl_hops: 0 })).ttl_hops).toBe(0);
  });

  it('handleIncoming processes once and relays new messages', () => {
    const seen = new SeenCache();
    const first = handleIncoming(env({ ttl_hops: 3 }), seen);
    expect(first.process).toBe(true);
    expect(first.relay?.ttl_hops).toBe(2);
    const second = handleIncoming(env({ ttl_hops: 3 }), seen); // same msg_id
    expect(second.process).toBe(false);
    expect(second.relay).toBeNull();
  });
});

/**
 * Multi-hop dead-zone simulation — the device-free stand-in for the 3-device test
 * (rahi-docs/06 §4). Topology is a line: n1 — n2 — n3 (n1 and n3 NOT in direct
 * range). A message from n1 must reach n3 by relaying through n2, each node
 * processing it exactly once, and TTL must bound the flood.
 */
class SimNode {
  readonly seen = new SeenCache();
  processed: MeshEnvelope[] = [];
  constructor(public id: string) {}
}

function runFlood(adjacency: Record<string, string[]>, origin: string, message: MeshEnvelope) {
  const nodes: Record<string, SimNode> = {};
  for (const id of Object.keys(adjacency)) nodes[id] = new SimNode(id);

  // queue of [toNode, fromNode, envelope]
  const queue: [string, string | null, MeshEnvelope][] = [[origin, null, message]];
  let steps = 0;
  while (queue.length && steps++ < 10_000) {
    const [to, from, e] = queue.shift()!;
    const node = nodes[to]!;
    const action = handleIncoming(e, node.seen);
    if (action.process) node.processed.push(e);
    if (action.relay) {
      for (const neighbor of adjacency[to]!) {
        if (neighbor !== from) queue.push([neighbor, to, action.relay]);
      }
    }
  }
  return nodes;
}

describe('mesh flood simulation', () => {
  const line = { n1: ['n2'], n2: ['n1', 'n3'], n3: ['n2'] };

  it('multi-hop: n1 → n3 via n2, each processes exactly once', () => {
    const nodes = runFlood(line, 'n1', env({ ttl_hops: 5, sender_id: 'n1' }));
    expect(nodes.n1!.processed).toHaveLength(1);
    expect(nodes.n2!.processed).toHaveLength(1);
    expect(nodes.n3!.processed).toHaveLength(1); // reached the far node
  });

  it('TTL bounds the flood: ttl=1 cannot reach the 2-hop node', () => {
    // origin processes (ttl 1), relays with ttl 0 to n2 which processes but
    // cannot relay onward → n3 never receives.
    const nodes = runFlood(line, 'n1', env({ ttl_hops: 1, sender_id: 'n1' }));
    expect(nodes.n1!.processed).toHaveLength(1);
    expect(nodes.n2!.processed).toHaveLength(1);
    expect(nodes.n3!.processed).toHaveLength(0);
  });

  it('no infinite loops in a cycle (dedup stops re-flooding)', () => {
    const ring = { a: ['b', 'c'], b: ['a', 'c'], c: ['a', 'b'] };
    const nodes = runFlood(ring, 'a', env({ ttl_hops: 5, sender_id: 'a' }));
    for (const id of ['a', 'b', 'c']) expect(nodes[id]!.processed).toHaveLength(1);
  });
});
