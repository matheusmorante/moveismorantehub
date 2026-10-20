import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  FiscalPendencyItem,
  FiscalPendenciesFilters,
} from '../types/fiscalPendencies.types';
import { fetchFiscalPendencies } from '../services/fiscalPendenciesService';

const DEFAULT_FILTERS: FiscalPendenciesFilters = {
  pendencyType: 'all',
  situation: 'all',
  environment: 'all',
  model: 'all',
  period: 'all',
  search: '',
};

export function useFiscalPendencies(canViewFiscal: boolean = true) {
  const [pendencies, setPendencies] = useState<FiscalPendencyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiscalPendenciesFilters>(DEFAULT_FILTERS);

  const loadPendencies = useCallback(async () => {
    if (!canViewFiscal) {
      setPendencies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await fetchFiscalPendencies();
      setPendencies(items);
    } catch (err) {
      console.error('[useFiscalPendencies] Erro ao carregar:', err);
      setError('Não foi possível carregar a lista de pendências fiscais.');
    } finally {
      setLoading(false);
    }
  }, [canViewFiscal]);

  useEffect(() => {
    void loadPendencies();
  }, [loadPendencies]);

  const setFilterField = useCallback(
    <K extends keyof FiscalPendenciesFilters>(field: K, value: FiscalPendenciesFilters[K]) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Filtros aplicados em memória de forma ultra-rápida e reativa
  const filteredPendencies = useMemo(() => {
    return pendencies.filter((item) => {
      if (filters.pendencyType !== 'all' && item.pendencyType !== filters.pendencyType) {
        return false;
      }
      if (filters.situation !== 'all' && item.situationStatus !== filters.situation) {
        return false;
      }
      if (filters.environment !== 'all' && String(item.environment) !== filters.environment) {
        return false;
      }
      if (filters.model !== 'all' && item.model !== filters.model) {
        return false;
      }

      // Período
      if (filters.period !== 'all') {
        const itemDate = new Date(item.identifiedAt).getTime();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (filters.period === 'today') {
          if (itemDate < startOfToday) return false;
        } else if (filters.period === '7days') {
          const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
          if (itemDate < sevenDaysAgo) return false;
        } else if (filters.period === '30days') {
          const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;
          if (itemDate < thirtyDaysAgo) return false;
        } else if (filters.period === 'currentMonth') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          if (itemDate < startOfMonth) return false;
        } else if (filters.period === 'custom') {
          if (filters.customDateFrom) {
            const from = new Date(filters.customDateFrom).getTime();
            if (itemDate < from) return false;
          }
          if (filters.customDateTo) {
            const to = new Date(filters.customDateTo).getTime() + 24 * 60 * 60 * 1000;
            if (itemDate > to) return false;
          }
        }
      }

      // Busca por pedido, cliente ou documento
      if (filters.search.trim()) {
        const query = filters.search.trim().toLowerCase();
        const queryDigits = query.replace(/\D/g, '');
        const matchIndex = String(item.orderIndex).toLowerCase().includes(query);
        const matchCustomer = item.customerName.toLowerCase().includes(query);
        const matchDoc = queryDigits.length > 0 && item.customerDocument.replace(/\D/g, '').includes(queryDigits);
        const matchOriginalNumber = item.originalDocumentNumber != null && String(item.originalDocumentNumber).includes(query);
        const matchCurrentNumber = item.currentDocumentNumber != null && String(item.currentDocumentNumber).includes(query);
        const matchReason = Boolean(item.reason?.toLowerCase().includes(query));

        if (!matchIndex && !matchCustomer && !matchDoc && !matchOriginalNumber && !matchCurrentNumber && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [pendencies, filters]);

  // Contagens e Métricas
  const metrics = useMemo(() => {
    let productionCount = 0;
    let homologationCount = 0;
    let reissueCount = 0;
    let rejectionCount = 0;
    let uncertainCount = 0;

    for (const item of pendencies) {
      if (item.environment === 1) productionCount++;
      else homologationCount++;

      if (item.pendencyType === 'awaiting_new_invoice' || item.pendencyType === 'draft') {
        reissueCount++;
      } else if (item.pendencyType === 'rejected' || item.pendencyType === 'prior_regularization_failed') {
        rejectionCount++;
      } else if (item.pendencyType === 'transmission_uncertain' || item.pendencyType === 'prior_regularization_uncertain') {
        uncertainCount++;
      }
    }

    return {
      openCount: pendencies.length,
      productionCount,
      homologationCount,
      reissueCount,
      rejectionCount,
      uncertainCount,
    };
  }, [pendencies]);

  return {
    pendencies: filteredPendencies,
    allPendencies: pendencies,
    loading,
    error,
    metrics,
    filters,
    setFilterField,
    resetFilters,
    reload: loadPendencies,
  };
}
