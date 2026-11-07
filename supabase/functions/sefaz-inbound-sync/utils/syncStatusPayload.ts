type NsuSyncStatusRecord = {
  status?: string | null;
  last_sync_at?: string | null;
  next_allowed_sync_at?: string | null;
  last_nsu?: string | null;
  max_nsu?: string | null;
  last_cstat?: string | null;
  last_xmotivo?: string | null;
  last_docs_count?: number | null;
  environment?: string | null;
} | null;

export function buildSyncStatusData(
  nsuRecord: NsuSyncStatusRecord,
  now: number,
  syncIntervalMs: number,
) {
  const lastSyncMs = nsuRecord?.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
  const storedNextAllowed = nsuRecord?.next_allowed_sync_at
    ? new Date(nsuRecord.next_allowed_sync_at).getTime()
    : 0;
  const nextAllowed = Math.max(
    storedNextAllowed,
    lastSyncMs ? lastSyncMs + syncIntervalMs : 0,
  );
  const isSyncing = nsuRecord?.status === "syncing" && (now - lastSyncMs < 180000);
  const isRateLimited = nsuRecord?.status === "rate_limited" && (now < nextAllowed);
  const canSyncNow = !isSyncing && (now >= nextAllowed);

  return {
    status: isSyncing ? "syncing" : isRateLimited ? "rate_limited" : (nsuRecord?.status || "idle"),
    lastSyncAt: nsuRecord?.last_sync_at || null,
    nextAllowedSyncAt: nextAllowed ? new Date(nextAllowed).toISOString() : null,
    lastNsu: nsuRecord?.last_nsu || "0",
    maxNsu: nsuRecord?.max_nsu || "0",
    lastCstat: nsuRecord?.last_cstat || null,
    lastXmotivo: nsuRecord?.last_xmotivo || null,
    lastDocsCount: nsuRecord?.last_docs_count || 0,
    environment: nsuRecord?.environment || "production",
    canSyncNow,
  };
}
