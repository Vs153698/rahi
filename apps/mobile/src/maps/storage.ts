/**
 * Pure storage-budget helpers for offline tile packs (rahi-docs/07 §7). Kept
 * dependency-free so they're unit-testable without the device filesystem.
 */

/** Human-readable bytes, e.g. 41_943_040 -> "40.0 MB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export interface PackSummaryInput {
  id: string;
  sizeBytes: number;
}

export interface StorageSummary {
  packCount: number;
  totalBytes: number;
  totalLabel: string;
}

export function summarizeStorage(packs: PackSummaryInput[]): StorageSummary {
  const totalBytes = packs.reduce((sum, p) => sum + Math.max(0, p.sizeBytes), 0);
  return { packCount: packs.length, totalBytes, totalLabel: formatBytes(totalBytes) };
}

/** Warn before a large download on a metered/wifi decision (rahi-docs/07 §7). */
export const LARGE_DOWNLOAD_WARN_BYTES = 50 * 1024 * 1024; // 50 MB

export function shouldWarnBeforeDownload(sizeBytes: number, onWifi: boolean): boolean {
  if (!onWifi) return true; // always warn off-wifi
  return sizeBytes >= LARGE_DOWNLOAD_WARN_BYTES;
}
