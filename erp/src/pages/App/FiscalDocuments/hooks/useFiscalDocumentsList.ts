import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { fiscalDocumentsListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import type { z } from 'zod';
import type {
  FiscalDocumentFilters,
  FiscalDocumentPeriod,
} from '../types/fiscalDocuments.types';
import {
  fetchFiscalDocumentsList,
  type FetchFiscalDocumentsResult,
} from '../services/fiscalDocumentsService';

function formatDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function useFiscalDocumentsList(canViewFiscal: boolean) {
  const [searchParams] = useSearchParams();
  const targetDocumentId = searchParams.get('documentId');
  const previousTargetDocumentId = useRef(targetDocumentId);
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [filterValidationError, setFilterValidationError] = useState<string | null>(null);

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [environmentFilter, setEnvironmentFilter] = useState(targetDocumentId ? 'all' : '1');
  useEffect(() => {
    if (previousTargetDocumentId.current === targetDocumentId) return;
    previousTargetDocumentId.current = targetDocumentId;
    setPageIndex(0);
    setEnvironmentFilter(targetDocumentId ? 'all' : '1');
  }, [targetDocumentId]);
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
  const { validateValues: validateList } = useZodForm(fiscalDocumentsListFormSchema, { filters, pageIndex, targetDocumentId } as z.input<typeof fiscalDocumentsListFormSchema>);

  const fiscalDocumentsQuery = useQuery<FetchFiscalDocumentsResult>({
    queryKey: [
      'fiscal-documents',
      search,
      statusFilter,
      modelFilter,
      environmentFilter,
      dateFrom,
      dateTo,
      pageIndex,
      targetDocumentId,
    ],
    queryFn: async () => {
      const values = await validateList({ filters, pageIndex, targetDocumentId } as z.input<typeof fiscalDocumentsListFormSchema>, (errors) => setFilterValidationError(Object.values(flattenFormErrors(errors))[0]));
      if (!values) throw new Error('Revise os filtros da consulta fiscal.');
      setFilterValidationError(null);
      return fetchFiscalDocumentsList(values);
    },
    enabled: canViewFiscal,
    staleTime: 0,
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

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canViewFiscal) return;
    if (pageIndex === 0 && search === searchInput) {
      void fiscalDocumentsQuery.refetch();
      return;
    }
    setPageIndex(0);
    setSearch(searchInput);
  };

  return {
    documents,
    loading,
    loadError,
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
