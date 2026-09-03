import { useState, useEffect } from 'react';
import { OfflineSyncSummary } from '../services/offline/offlineTypes';
import { offlineSyncManager } from '../services/offline/offlineSyncManager';

export function useOfflineSync() {
  const [summary, setSummary] = useState<OfflineSyncSummary>({
    pendingCount: 0,
    syncingCount: 0,
    rejectedCount: 0,
    hasRejections: false,
    isOnline: true,
  });

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((newSummary) => {
      setSummary(newSummary);
    });

    offlineSyncManager.getSummary().then(setSummary);
    return () => unsubscribe();
  }, []);

  const syncNow = () => {
    return offlineSyncManager.processQueue();
  };

  return {
    ...summary,
    syncNow,
  };
}
