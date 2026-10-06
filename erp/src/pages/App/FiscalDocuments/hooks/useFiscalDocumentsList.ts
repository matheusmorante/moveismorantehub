import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  CancellationEligibility,
  FiscalDocumentFilters,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { fetchFiscalDocumentsList } from '../services/fiscalDocumentsService';

export function useFiscalDocumentsList(canOperateFiscal: boolean) {
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
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const filters: FiscalDocumentFilters = {
    search,
    status: statusFilter,
    model: modelFilter,
    environment: environmentFilter,
    series: seriesFilter,
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
          series: seriesFilter,
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
    seriesFilter,
    dateFrom,
    dateTo,
    pageIndex,
    targetDocumentId,
  ]);

  useEffect(() => {
    if (!canOperateFiscal) {
      setLoading(false);
      return;
    }
    loadDocuments();
  }, [canOperateFiscal, loadDocuments]);

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
    setSeriesFilter,
    setDateFrom: (date: string) => {
      setPageIndex(0);
      setDateFrom(date);
    },
    setDateTo: (date: string) => {
      setPageIndex(0);
      setDateTo(date);
    },
    showMoreFilters,
    setShowMoreFilters,
  };
}
