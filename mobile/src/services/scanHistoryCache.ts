import { getScanHistoryDetail, type ScanDetail } from './dashboard';

/**
 * Shared, stale-while-revalidate cache for scan history detail.
 *
 * Progress and Shelf both need the same 90-scan history and were each
 * refetching it (with a blocking spinner) on every tab focus. This cache lets
 * them paint instantly from the last result and refresh quietly in the
 * background, and dedupes concurrent requests into a single network call.
 */

const TTL_MS = 60_000;
const DEFAULT_LIMIT = 90;

let cache: ScanDetail[] | null = null;
let cachedAt = 0;
let inflight: Promise<ScanDetail[]> | null = null;

/** Synchronous snapshot of the last loaded history (or null if never loaded). */
export function getCachedScanHistory(): ScanDetail[] | null {
  return cache;
}

/** True when the cached history is still within its freshness window. */
export function isScanHistoryFresh(): boolean {
  return cache != null && Date.now() - cachedAt < TTL_MS;
}

/**
 * Load scan history, served from cache when fresh. Concurrent callers share a
 * single request. Pass `force` to bypass the freshness check (e.g. after a new
 * scan or pull-to-refresh).
 */
export async function loadScanHistory(
  limit = DEFAULT_LIMIT,
  force = false,
): Promise<ScanDetail[]> {
  if (!force && isScanHistoryFresh()) {
    return cache!;
  }
  if (inflight) {
    return inflight;
  }
  inflight = getScanHistoryDetail(limit)
    .then((data) => {
      cache = data;
      cachedAt = Date.now();
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drop the cache so the next load hits the network (call after a new scan). */
export function invalidateScanHistory(): void {
  cache = null;
  cachedAt = 0;
}
