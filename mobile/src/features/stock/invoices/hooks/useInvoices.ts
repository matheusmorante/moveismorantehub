import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Invoice, InvoiceDateFilter } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import { subscribeToInboundInvoiceListRefresh } from '../../../../services/stock/invoices/inboundInvoiceRealtimeService';
import { getDefaultInvoiceDateFilter } from '../utils/invoiceList';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { invoiceListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>(() =>
    getDefaultInvoiceDateFilter()
  );
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestId = useRef(0);
  const pendingVisibleLoad = useRef(false);
  const { validateValues: validateList } = useZodForm(invoiceListFormSchema, { page: page - 1, searchTerm, dateFilter });

  const loadInvoices = useCallback(async (silent = false) => {
    const currentRequest = ++requestId.current;
    if (!silent) {
      pendingVisibleLoad.current = true;
      setLoading(true);
      setError(null);
    }

    try {
      const values = await validateList(
        { page: page - 1, searchTerm, dateFilter },
        (errors) => {
          if (!silent && currentRequest === requestId.current) {
            setError(Object.values(flattenFormErrors(errors))[0]);
          }
        }
      );
      if (!values) return;

      const result = await stockService.fetchInboundInvoicesPage(values);
      if (currentRequest !== requestId.current) return;
      setInvoices(result.invoices);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (loadError: unknown) {
      if (currentRequest !== requestId.current) return;
      console.error('Failed to fetch invoices:', loadError);
      if (!silent) {
        setError('Erro ao carregar notas fiscais. Tente novamente.');
        setInvoices([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } finally {
      if (currentRequest === requestId.current && pendingVisibleLoad.current) {
        pendingVisibleLoad.current = false;
        setLoading(false);
      }
    }
  }, [dateFilter, page, searchTerm, validateList]);

  const loadInvoicesRef = useRef(loadInvoices);
  loadInvoicesRef.current = loadInvoices;

  useEffect(() => {
    pendingVisibleLoad.current = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => void loadInvoices(), 350);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
    };
  }, [loadInvoices, reloadVersion]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (AppState.currentState !== 'active') {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
        return;
      }
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadInvoicesRef.current(true);
      }, 450);
    };
    const unsubscribe = subscribeToInboundInvoiceListRefresh(scheduleRefresh);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleRefresh();
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const updateSearchTerm = useCallback((value: string) => {
    setPage(1);
    setSearchTerm(value);
  }, []);

  const updateDateFilter = useCallback((value: InvoiceDateFilter) => {
    setPage(1);
    setDateFilter(value);
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      if (!loading && newPage >= 1 && newPage <= totalPages) setPage(newPage);
    },
    [loading, totalPages]
  );

  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);

  return {
    invoices,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    searchTerm,
    dateFilter,
    setSearchTerm: updateSearchTerm,
    setDateFilter: updateDateFilter,
    goToPage,
    reload,
  };
};
