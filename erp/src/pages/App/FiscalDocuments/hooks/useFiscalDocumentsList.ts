import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { fiscalDocumentsListFormSchema, fiscalDocumentsSearchFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import type { z } from 'zod';
import type {
  FiscalDocumentFilters,
  FiscalDocumentPeriod,
} from '../types/fiscalDocuments.types';
import {
  fetchFiscalDocumentsList,
  fetchFiscalDocumentsSummary,
  type FetchFiscalDocumentsResult,
  type FiscalDocumentsSummary,
} from '../services/fiscalDocumentsService';

function formatDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function useFiscalDocumentsList(
  canViewFiscal: boolean,
  productionOnly = false,
  accountantView = false
) {
  const [searchParams] = useSearchParams();
  const targetDocumentId = searchParams.get('documentId');
  const previousTargetDocumentId = useRef(targetDocumentId);
  const previousProductionOnly = useRef(productionOnly);
  const previousAccountantView = useRef(accountantView);
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [filterValidationError, setFilterValidationError] = useState<string | null>(null);

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchRef = useRef(search);
  searchRef.current = search;
  const { validateValues: validateSearch } = useZodForm(fiscalDocumentsSearchFormSchema, { search: searchInput });

  useEffect(() => {
    if (!canViewFiscal) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void validateSearch({ search: searchInput }).then((values) => {
        if (!current || !values || values.search === searchRef.current) return;
        setPageIndex(0);
        setSearch(values.search);
      });
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [canViewFiscal, searchInput, validateSearch]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'all' | 'outbound' | 'estorno'>('all');
  const [selectedEnvironmentFilter, setSelectedEnvironmentFilter] = useState(
    targetDocumentId && !productionOnly ? 'all' : '1'
  );
  const environmentFilter = productionOnly ? '1' : selectedEnvironmentFilter;
  useEffect(() => {
    if (
      previousTargetDocumentId.current === targetDocumentId &&
      previousProductionOnly.current === productionOnly
    ) return;
    previousTargetDocumentId.current = targetDocumentId;
    previousProductionOnly.current = productionOnly;
    setPageIndex(0);
    setSelectedEnvironmentFilter(targetDocumentId && !productionOnly ? 'all' : '1');
  }, [targetDocumentId, productionOnly]);
  useEffect(() => {
    if (previousAccountantView.current === accountantView) return;
    previousAccountantView.current = accountantView;
    setPageIndex(0);
    setStatusFilter('all');
  }, [accountantView]);
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
    documentType: documentTypeFilter,
    dateFrom,
    dateTo,
  };
  const { validateValues: validateList } = useZodForm(fiscalDocumentsListFormSchema, { filters, pageIndex, targetDocumentId } as z.input<typeof fiscalDocumentsListFormSchema>);

  const fiscalDocumentsQuery = useQuery<FetchFiscalDocumentsResult>({
    queryKey: [
      'fiscal-documents',
      search,
      statusFilter,
      modelFilter,
      environmentFilter,
      documentTypeFilter,
      accountantView,
      dateFrom,
      dateTo,
      pageIndex,
      targetDocumentId,
    ],
    queryFn: async () => {
      const values = await validateList({ filters, pageIndex, targetDocumentId } as z.input<typeof fiscalDocumentsListFormSchema>, (errors) => setFilterValidationError(Object.values(flattenFormErrors(errors))[0]));
      if (!values) throw new Error('Revise os filtros da consulta fiscal.');
      setFilterValidationError(null);
      return fetchFiscalDocumentsList({ ...values, accountantView });
    },
    enabled: canViewFiscal,
    staleTime: 0,
  });

  const fiscalDocumentsSummaryQuery = useQuery<FiscalDocumentsSummary>({
    queryKey: [
      'fiscal-documents',
      'summary',
      search,
      statusFilter,
      modelFilter,
      environmentFilter,
      documentTypeFilter,
      accountantView,
      dateFrom,
      dateTo,
      targetDocumentId,
    ],
    queryFn: async () => {
      const values = await validateList(
        { filters, pageIndex, targetDocumentId } as z.input<typeof fiscalDocumentsListFormSchema>,
        (errors) => setFilterValidationError(Object.values(flattenFormErrors(errors))[0])
      );
      if (!values) throw new Error('Revise os filtros da consulta fiscal.');
      setFilterValidationError(null);
      return fetchFiscalDocumentsSummary({
        filters: values.filters,
        targetDocumentId: values.targetDocumentId,
        accountantView,
      });
    },
    enabled: canViewFiscal,
    staleTime: 30_000,
  });

  const documents = fiscalDocumentsQuery.data?.documents ?? [];
  const documentCount = fiscalDocumentsQuery.data?.totalCount ?? 0;
  const orderNumbers = fiscalDocumentsQuery.data?.orderNumbers ?? {};
  const cancellationEligibility = fiscalDocumentsQuery.data?.cancellationEligibility ?? {};
  const loading = fiscalDocumentsQuery.isFetching;
  const loadError = filterValidationError || (fiscalDocumentsQuery.isError
    ? 'Falha ao consultar as notas fiscais. Tente atualizar a lista.'
    : null);

  const loadDocuments = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
  }, [queryClient]);

  return {
    documents,
    loading,
    loadError,
    pageIndex,
    setPageIndex,
    documentCount,
    orderNumbers,
    cancellationEligibility,
    summary: fiscalDocumentsSummaryQuery.data,
    summaryLoading: fiscalDocumentsSummaryQuery.isFetching,
    summaryLoadError: fiscalDocumentsSummaryQuery.isError
      ? 'Não foi possível carregar os totalizadores fiscais.'
      : null,
    reloadSummary: fiscalDocumentsSummaryQuery.refetch,
    loadDocuments,
    // Filtros e controles
    filters,
    searchInput,
    setSearchInput,
    setStatusFilter: (status: string) => {
      setPageIndex(0);
      setStatusFilter(status);
    },
    setModelFilter: (model: string) => {
      setPageIndex(0);
      setModelFilter(model);
    },
    setDocumentTypeFilter: (documentType: 'all' | 'outbound' | 'estorno') => {
      setPageIndex(0);
      setDocumentTypeFilter(documentType);
    },
    setEnvironmentFilter: (env: string) => {
      if (productionOnly) return;
      setPageIndex(0);
      setSelectedEnvironmentFilter(env);
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
