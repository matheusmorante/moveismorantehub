import { useState, useCallback, useEffect, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { purchaseListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import { supabase } from '../../../../services/supabaseClient';
import {
  fetchMobilePurchases,
  MobilePurchase,
  PurchaseFilters,
  PURCHASE_PAGE_SIZE,
} from '../mobilePurchaseService';

export const usePurchases = (filters: PurchaseFilters = {}) => {
  const [purchases, setPurchases] = useState<MobilePurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const realtimeReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { validateValues: validateList } = useZodForm(purchaseListFormSchema, { page, ...filters });

  const loadPurchases = useCallback(
    async (isRefresh = false, pageNum = 0) => {
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
        const values = await validateList({ ...filters, page: pageNum },
          (errors) => setError(Object.values(flattenFormErrors(errors))[0]));
        if (!values) return;
        const { page: validatedPage, ...validatedFilters } = values;
        const result = await fetchMobilePurchases(validatedPage, validatedFilters);
        setPurchases((previous) =>
          isRefresh || pageNum === 0 ? result.data : [...previous, ...result.data]
        );
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
    },
    [filters.search, filters.supplierId, validateList]
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) void loadPurchases(false, page + 1);
  }, [hasMore, loading, loadingMore, loadPurchases, page]);
  const reload = useCallback(() => {
    if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
    realtimeReloadTimerRef.current = null;
    return loadPurchases(true, 0);
  }, [loadPurchases]);

  useEffect(() => {
    void loadPurchases(true, 0);
  }, [loadPurchases]);

  useEffect(() => {
    const scheduleReload = () => {
      if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
      realtimeReloadTimerRef.current = setTimeout(() => {
        realtimeReloadTimerRef.current = null;
        void loadPurchases(true, 0);
      }, 1000);
    };
    const channel = supabase
      .channel(`mobile-purchases-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        scheduleReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_items' },
        scheduleReload
      )
      .subscribe();
    return () => {
      if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
      realtimeReloadTimerRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [loadPurchases]);

  return {
    purchases,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  };
};
