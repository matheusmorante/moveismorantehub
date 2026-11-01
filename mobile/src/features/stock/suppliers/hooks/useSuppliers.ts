import { useState, useCallback, useEffect, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { supplierListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import * as stockService from '../../../../services/stockService';
import type { SupplierDeletionCounts } from '../../../../../../shared-utils/supplierDeletion';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [productCountErrors, setProductCountErrors] = useState<Record<string, boolean>>({});
  const [supplierDeletionCounts, setSupplierDeletionCounts] = useState<
    Record<string, SupplierDeletionCounts>
  >({});
  const [supplierDeletionCountLoading, setSupplierDeletionCountLoading] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'full_name' | 'created_at'>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>();
  const requestSequence = useRef(0);
  const supplierCountRequestIds = useRef(new Map<string, number>());
  const { validateValues: validateList } = useZodForm(supplierListFormSchema, { page, search: debouncedSearch, sortBy, sortOrder, activeOnly });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const loadSuppliers = useCallback(
    async (reset = false, pageNum = 0) => {
      const requestId = ++requestSequence.current;
      if (reset) {
        setPage(0);
        setHasMore(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const values = await validateList({ page: pageNum, search: debouncedSearch.trim(), sortBy, sortOrder, activeOnly },
          (errors) => { if (requestId === requestSequence.current) setError(Object.values(flattenFormErrors(errors))[0]); });
        if (!values) return;
        const data = await stockService.fetchSuppliers(
          values.page,
          values.search,
          values.sortBy,
          values.sortOrder,
          values.activeOnly
        );
        const formatted = (data || []).map((supplier: any) => ({
          ...supplier,
          name: supplier.full_name || supplier.name || 'Fornecedor Desconhecido',
          documentNumber: supplier.cpf_cnpj || supplier.document_number || '',
          personType: supplier.person_type_pf_pj || 'PF',
          socialName: supplier.social_name || '',
          tradeName: supplier.trade_name || '',
          leadTime: supplier.lead_time ?? 0,
          fullAddress: supplier.full_address || {},
          city: supplier.full_address?.city || supplier.full_address?.cidade || supplier.city || '',
          state:
            supplier.full_address?.state || supplier.full_address?.estado || supplier.state || '',
          observation: supplier.observation || '',
          active: supplier.active !== false,
        }));
        if (requestId !== requestSequence.current) return;
        setSuppliers((current) => (reset ? formatted : [...current, ...formatted]));
        setHasMore(data.length >= stockService.ITEMS_PER_PAGE);
        setPage(pageNum);
        const supplierIds = formatted.map((supplier) => String(supplier.id)).filter(Boolean);
        if (supplierIds.length) {
          const countRequestIds = new Map(
            supplierIds.map((id) => {
              const nextRequestId = (supplierCountRequestIds.current.get(id) || 0) + 1;
              supplierCountRequestIds.current.set(id, nextRequestId);
              return [id, nextRequestId] as const;
            })
          );
          const isCurrentRequest = (id: string) =>
            supplierCountRequestIds.current.get(id) === countRequestIds.get(id);
          setSupplierDeletionCountLoading((current) => ({
            ...current,
            ...Object.fromEntries(supplierIds.map((id) => [id, true])),
          }));
          setProductCountErrors((current) => {
            const next = { ...current };
            supplierIds.forEach((id) => delete next[id]);
            return next;
          });
          void stockService
            .fetchSupplierDeletionCounts(supplierIds)
            .then((counts) => {
              const currentSupplierIds = supplierIds.filter(isCurrentRequest);
              if (!currentSupplierIds.length) return;
              const currentCounts = Object.fromEntries(
                currentSupplierIds.map((id) => [id, counts[id]])
              );
              setSupplierDeletionCounts((current) => ({ ...current, ...currentCounts }));
              setProductCounts((current) => ({
                ...current,
                ...Object.fromEntries(
                  currentSupplierIds.map((id) => [id, counts[id].productCount])
                ),
              }));
              setProductCountErrors((current) => {
                const next = { ...current };
                currentSupplierIds.forEach((id) => delete next[id]);
                return next;
              });
            })
            .catch((countError) => {
              const currentSupplierIds = supplierIds.filter(isCurrentRequest);
              if (!currentSupplierIds.length) return;
              console.error(
                'Não foi possível verificar os vínculos dos fornecedores:',
                countError
              );
              setProductCountErrors((current) => ({
                ...current,
                ...Object.fromEntries(currentSupplierIds.map((id) => [id, true])),
              }));
            })
            .finally(() => {
              const currentSupplierIds = supplierIds.filter(isCurrentRequest);
              if (!currentSupplierIds.length) return;
              setSupplierDeletionCountLoading((current) => {
                const next = { ...current };
                currentSupplierIds.forEach((id) => delete next[id]);
                return next;
              });
            });
        }
      } catch (err) {
        if (requestId !== requestSequence.current) return;
        console.error('Failed to fetch suppliers:', err);
        setError('Não foi possível carregar os fornecedores. Tente novamente.');
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, sortBy, sortOrder, activeOnly, validateList]
  );

  useEffect(() => {
    void loadSuppliers(true, 0);
  }, [loadSuppliers]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) void loadSuppliers(false, page + 1);
  }, [loadingMore, loading, hasMore, page, loadSuppliers]);

  const saveSupplier = async (supplierData: any) => {
    const saved = await stockService.saveSupplier(supplierData);
    await loadSuppliers(true, 0);
    return saved;
  };

  const moveToTrash = async (supplierId: string) => {
    await stockService.moveSupplierToTrash(supplierId);
    await loadSuppliers(true, 0);
  };

  const retryProductCount = async (supplierId: string) => {
    const requestId = (supplierCountRequestIds.current.get(supplierId) || 0) + 1;
    supplierCountRequestIds.current.set(supplierId, requestId);
    const isCurrentRequest = () => supplierCountRequestIds.current.get(supplierId) === requestId;
    setProductCountErrors((current) => ({ ...current, [supplierId]: false }));
    setSupplierDeletionCountLoading((current) => ({ ...current, [supplierId]: true }));
    try {
      const counts = await stockService.fetchSupplierDeletionCounts([supplierId]);
      if (!isCurrentRequest()) return;
      setSupplierDeletionCounts((current) => ({ ...current, ...counts }));
      setProductCounts((current) => ({
        ...current,
        [supplierId]: counts[supplierId].productCount,
      }));
      setProductCountErrors((current) => ({ ...current, [supplierId]: false }));
    } catch (countError) {
      if (isCurrentRequest()) {
        console.error('Não foi possível verificar os vínculos do fornecedor:', countError);
        setProductCountErrors((current) => ({ ...current, [supplierId]: true }));
      }
    } finally {
      if (isCurrentRequest()) {
        setSupplierDeletionCountLoading((current) => ({ ...current, [supplierId]: false }));
      }
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    await stockService.deleteSupplierIfUnlinked(supplierId);
    await loadSuppliers(true, 0);
  };

  return {
    suppliers,
    productCounts,
    productCountErrors,
    supplierDeletionCounts,
    supplierDeletionCountLoading,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    activeOnly,
    setActiveOnly,
    reload: () => loadSuppliers(true, 0),
    saveSupplier,
    moveToTrash,
    deleteSupplier,
    retryProductCount,
  };
};
