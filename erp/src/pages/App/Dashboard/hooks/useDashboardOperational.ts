import { useEffect, useState } from 'react';
import type { DashboardMetrics } from '../dashboardMetrics';

export type OperationalData = DashboardMetrics['operational'] & { pendingReceiptsCount: number };

export const useDashboardOperational = (counts: DashboardMetrics['operational']): OperationalData => {
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState<number>(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('morantehub_goods_receipts_v1');
      if (stored) {
        const receipts = JSON.parse(stored);
        const drafts = receipts.filter((r: any) => r.status === 'draft' || r.isDraft);
        setPendingReceiptsCount(drafts.length);
      }
    } catch {
      setPendingReceiptsCount(0);
    }
  }, []);

  return { ...counts, pendingReceiptsCount };
};
