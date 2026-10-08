import { useState, useCallback, useEffect, useMemo } from 'react';
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import type {
  CancellationEligibility,
  FiscalDocumentFilters,
  FiscalDocumentPeriod,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { fetchFiscalDocumentsList } from '../services/fiscalDocumentsService';

function formatDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function useFiscalDocumentsList(canViewFiscal: boolean) {
  const [searchParams] = useSearchParams();
  const targetDocumentId = searchParams.get('documentId');

  const [documents, setDocuments] = useState<NfeDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [orderNumbers, setOrderNumbers] = useState<Record<string, number>>({});
  const [cancellationEligibility, setCancellationEligibility] = useState<
    Record<string, CancellationEligibility>
  >({});

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [environmentFilter, setEnvironmentFilter] = useState(targetDocumentId ? 'all' : '1');
  const [period, setPeriod] = useState<FiscalDocumentPeriod>('last_30_days');
  const [customDateFrom, setCustomDateFrom] = useState(() =>
    formatDate(subDays(new Date(), 29))
  );
  const [customDateTo, setCustomDateTo] = useState(() => formatDate(new Date()));

  const { dateFrom, dateTo } = useMemo(() => {
    const today = new Date();

    switch (period) {
      case 'last_30_days':
        return { dateFrom: formatDate(subDays(today, 29)), dateTo: formatDate(today) };
      case 'this_month':
        return { dateFrom: formatDate(startOfMonth(today)), dateTo: formatDate(today) };
      case 'last_month': {
        const previousMonth = subMonths(today, 1);
        return {
          dateFrom: formatDate(startOfMonth(previousMonth)),
          dateTo: formatDate(endOfMonth(previousMonth)),
        };
      }
      case 'last_3_months':
        return { dateFrom: formatDate(subMonths(today, 3)), dateTo: formatDate(today) };
      case 'this_year':
        return { dateFrom: formatDate(startOfYear(today)), dateTo: formatDate(today) };
      case 'custom':
        return { dateFrom: customDateFrom, dateTo: customDateTo };
    }
  }, [period, customDateFrom, customDateTo]);

  const filters: FiscalDocumentFilters = {
    search,
    status: statusFilter,
    model: modelFilter,
    environment: environmentFilter,
    dateFrom,
    dateTo,
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFiscalDocumentsList({
        filters: {
          search,
          status: statusFilter,
          model: modelFilter,
          environment: environmentFilter,
          dateFrom,
          dateTo,
        },
        pageIndex,
        targetDocumentId,
      });

      setDocuments(result.documents);
      setDocumentCount(result.totalCount);
      setOrderNumbers(result.orderNumbers);
      setCancellationEligibility(result.cancellationEligibility);
    } catch (err) {
      console.error('Erro ao carregar documentos fiscais:', err);
      setDocuments([]);
      setDocumentCount(0);
      setOrderNumbers({});
      setCancellationEligibility({});
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    modelFilter,
    environmentFilter,
    dateFrom,
    dateTo,
    pageIndex,
    targetDocumentId,
  ]);

  useEffect(() => {
    if (!canViewFiscal) {
      setLoading(false);
      return;
    }
    loadDocuments();
  }, [canViewFiscal, loadDocuments]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPageIndex(0);
    setSearch(searchInput);
  };

  return {
    documents,
    loading,
    pageIndex,
    setPageIndex,
    documentCount,
    orderNumbers,
    cancellationEligibility,
    loadDocuments,
    // Filtros e controles
    filters,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
    setStatusFilter: (status: string) => {
      setPageIndex(0);
      setStatusFilter(status);
    },
    setModelFilter: (model: string) => {
      setPageIndex(0);
      setModelFilter(model);
    },
    setEnvironmentFilter: (env: string) => {
      setPageIndex(0);
      setEnvironmentFilter(env);
    },
    period,
    setPeriod: (nextPeriod: FiscalDocumentPeriod) => {
      setPageIndex(0);
      setPeriod(nextPeriod);
    },
    customDateFrom,
    customDateTo,
    setCustomDateFrom: (date: string) => {
      setPageIndex(0);
      setCustomDateFrom(date);
    },
    setCustomDateTo: (date: string) => {
      setPageIndex(0);
      setCustomDateTo(date);
    },
  };
}
