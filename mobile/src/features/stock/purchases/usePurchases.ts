import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import {
  fetchMobilePurchases,
  MobilePurchase,
  PurchaseFilters,
  PURCHASE_PAGE_SIZE,
} from './mobilePurchaseService';

export const usePurchases = (filters: PurchaseFilters = {}) => {
  const [purchases, setPurchases] = useState<MobilePurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPurchases = useCallback(async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
      setPage(0);
      setHasMore(true);
      setLoading(true);
    } else if (pageNum > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const result = await fetchMobilePurchases(pageNum, filters);
      setPurchases(previous => isRefresh || pageNum === 0 ? result.data : [...previous, ...result.data]);
      setHasMore(result.data.length >= PURCHASE_PAGE_SIZE);
      setPage(pageNum);
    } catch (cause: any) {
      console.error('[Purchases] Falha ao carregar pedidos:', cause);
      setError(cause?.message || 'Não foi possível carregar os pedidos de compra.');
      if (isRefresh || pageNum === 0) setPurchases([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters.search, filters.supplierId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) void loadPurchases(false, page + 1);
  }, [hasMore, loading, loadingMore, loadPurchases, page]);

  useEffect(() => {
    void loadPurchases(true, 0);
  }, [loadPurchases]);

  useEffect(() => {
    const channel = supabase
      .channel(`mobile-purchases-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => void loadPurchases(true, 0))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_items' }, () => void loadPurchases(true, 0))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPurchases]);

  return { purchases, loading, loadingMore, error, hasMore, loadMore, reload: () => loadPurchases(true, 0) };
};
