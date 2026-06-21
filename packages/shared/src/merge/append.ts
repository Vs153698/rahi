/**
 * Append-only union for immutable telemetry: track_points, coverage_samples,
 * fuel_logs, kitty_contributions (rahi-docs/05 §3). These rows are never edited,
 * so there are no conflicts — merging is a union keyed by id. Output is sorted
 * by id for a canonical ordering.
 */
export function mergeAppendOnly<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) if (!byId.has(row.id)) byId.set(row.id, row);
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Derived kitty balance = sum of contributions − spend. Never stored-then-edited. */
export function deriveKittyBalance(
  contributions: { amount_paise: number }[],
  spentPaise = 0,
): number {
  const total = contributions.reduce((sum, c) => sum + c.amount_paise, 0);
  return total - spentPaise;
}
