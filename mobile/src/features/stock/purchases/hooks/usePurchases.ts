import { useState, useCallback, useEffect, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { purchaseListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
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
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const loadedKeyRef = useRef<string | null>(null);
  const previousFiltersRef = useRef<PurchaseFilters | null>(null);
  const filterKey = JSON.stringify([filters.search, filters.supplierId]);
  const filtersRef = useRef({ ...filters, key: filterKey });
  filtersRef.current = { ...filters, key: filterKey };
  const { validateValues: validateList } = useZodForm(purchaseListFormSchema, { page, ...filters });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  const loadPurchases = useCallback(
    async (isRefresh = false, pageNum = 0) => {
      if (!mountedRef.current) return;
      const { key, ...requestedFilters } = filtersRef.current;
      if (pageNum > 0 && (inFlightRef.current || loadedKeyRef.current !== key)) return;
      const requestId = ++requestIdRef.current;
      inFlightRef.current = true;
      const isCurrent = () => mountedRef.current && requestId === requestIdRef.current &&
        key === filtersRef.current.key;
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
        const values = await validateList({ ...requestedFilters, page: pageNum },
          (errors) => {
            if (isCurrent()) setError(Object.values(flattenFormErrors(errors))[0]);
          });
        if (!isCurrent() || !values) return;
        const { page: validatedPage, ...validatedFilters } = values;
        const result = await withTimeout(
          fetchMobilePurchases(validatedPage, validatedFilters), 15_000, null,
          'mobile:purchase-list',
        );
        if (!isCurrent()) return;
        if (!result) throw new Error('A busca de pedidos demorou. Tente novamente.');
        loadedKeyRef.current = key;
        setPurchases((previous) =>
          !isCurrent() ? previous :
            isRefresh || pageNum === 0 ? result.data : [...previous, ...result.data]
        );
        setHasMore(result.data.length >= PURCHASE_PAGE_SIZE);
        setPage(pageNum);
      } catch (cause: any) {
        if (!isCurrent()) return;
        console.error('[Purchases] Falha ao carregar pedidos:', cause);
        setError(cause?.message || 'Não foi possível carregar os pedidos de compra.');
        if (isRefresh || pageNum === 0) setPurchases([]);
        setHasMore(false);
      } finally {
        if (isCurrent()) {
          inFlightRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [validateList]
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) void loadPurchases(false, page + 1);
  }, [hasMore, loading, loadingMore, loadPurchases, page]);
  const reload = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
    if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
    realtimeReloadTimerRef.current = null;
    return loadPurchases(true, 0);
  }, [loadPurchases]);

  useEffect(() => {
    const previous = previousFiltersRef.current;
    previousFiltersRef.current = { search: filters.search, supplierId: filters.supplierId };
    requestIdRef.current += 1;
    inFlightRef.current = false;
    loadedKeyRef.current = null;
    setLoading(true);
    setLoadingMore(false);
    if (!previous || previous.supplierId !== filters.supplierId || previous.search === filters.search) {
      void reload();
    } else {
      searchTimerRef.current = setTimeout(() => {
        searchTimerRef.current = null;
        void reload();
      }, 350);
    }
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    };
  }, [filters.search, filters.supplierId, reload]);

  useEffect(() => {
    const scheduleReload = () => {
      if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
      realtimeReloadTimerRef.current = setTimeout(() => {
        realtimeReloadTimerRef.current = null;
        void reload();
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
  }, [reload]);

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
