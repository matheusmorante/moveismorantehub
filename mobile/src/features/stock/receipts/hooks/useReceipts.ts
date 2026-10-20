import { useState, useCallback, useEffect } from 'react';
import * as stockService from '../../../../services/stockService';
import { offlineStorageService } from '../../../../services/offline/offlineStorageService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import {
  GOODS_RECEIPTS_CACHE_KEY,
  getPendingGoodsReceiptChecks,
  syncPendingGoodsReceipts,
} from '../../../../services/stock/stockReceiptsService';

const overlayPendingChecksOnReceipts = async (list: any[]): Promise<any[]> => {
  try {
    const pendingChecks = await getPendingGoodsReceiptChecks();
    if (pendingChecks.length === 0) return list;
    const byId = new Map(pendingChecks.map((p) => [p.receiptId, p]));
    return list.map((r) => {
      const pending = r?.id ? byId.get(String(r.id)) : undefined;
      if (!pending || r.status === 'estornado') return r;
      return {
        ...r,
        status: 'received',
        checkedVolumes: pending.checkedVolumes,
      };
    });
  } catch {
    return list;
  }
};

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadReceipts = useCallback(async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
      setPage(0);
      setHasMore(true);
    } else if (pageNum > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      if (connectivityService.connected && pageNum === 0) {
        await syncPendingGoodsReceipts().catch(() => 0);
      }

      const data = await stockService.fetchReceipts(pageNum);

      const formattedData = (data || []).map((receipt: any) => ({
        id: receipt.id,
        receipt_index: receipt.receipt_index ?? receipt.receiptIndex,
        receiptIndex: receipt.receiptIndex ?? receipt.receipt_index,
        supplierName: receipt.supplierName || receipt.supplier_name || 'Fornecedor',
        status: receipt.status || 'draft',
        created_at: receipt.created_at,
        received_at: receipt.received_at,
        fiscal_key: receipt.fiscal_key || '',
        invoice_number: receipt.invoice_number || receipt.invoiceNumber || '',
        invoiceNumber: receipt.invoice_number || receipt.invoiceNumber || '',
        totalValue: receipt.totalValue || receipt.total_value || 0,
        checkedVolumes: receipt.checkedVolumes,
        items: Array.isArray(receipt.items) ? receipt.items : [],
      }));

      if (formattedData.length > 0 && pageNum === 0) {
        await offlineStorageService
          .cacheWorkingSet(GOODS_RECEIPTS_CACHE_KEY, formattedData)
          .catch(() => {});
      }

      if (formattedData.length === 0 && pageNum === 0 && !connectivityService.connected) {
        const cached =
          await offlineStorageService.getWorkingSet<any[]>(GOODS_RECEIPTS_CACHE_KEY);
        if (Array.isArray(cached?.data) && cached.data.length > 0) {
          setReceipts(await overlayPendingChecksOnReceipts(cached.data));
          setHasMore(false);
          return;
        }
      }

      if (isRefresh || pageNum === 0) {
        setReceipts(formattedData);
      } else {
        setReceipts((prev) => [...prev, ...formattedData]);
      }

      if (data && data.length < stockService.ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
      if (pageNum === 0) {
        try {
          const cached =
            await offlineStorageService.getWorkingSet<any[]>(GOODS_RECEIPTS_CACHE_KEY);
          if (Array.isArray(cached?.data)) {
            setReceipts(await overlayPendingChecksOnReceipts(cached.data));
          }
        } catch {}
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      void loadReceipts(false, nextPage);
    }
  }, [loadingMore, hasMore, loading, page, loadReceipts]);

  useEffect(() => {
    void loadReceipts(true, 0);
  }, [loadReceipts]);

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((online) => {
      if (online) {
        void loadReceipts(true, 0);
      }
    });
    return unsubscribe;
  }, [loadReceipts]);

  return { receipts, loading, loadingMore, loadMore, reload: () => loadReceipts(true, 0) };
};
