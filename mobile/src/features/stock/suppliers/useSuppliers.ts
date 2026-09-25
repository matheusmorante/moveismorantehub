import { useState, useCallback, useEffect, useRef } from 'react';
import * as stockService from '../../../services/stockService';

export const useSuppliers = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [productCounts, setProductCounts] = useState<Record<string, number>>({});
    const [productCountErrors, setProductCountErrors] = useState<Record<string, boolean>>({});
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
    const fetchedCountIds = useRef(new Set<string>());
    const requestSequence = useRef(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadSuppliers = useCallback(async (reset = false, pageNum = 0) => {
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
            const data = await stockService.fetchSuppliers(pageNum, debouncedSearch.trim(), sortBy, sortOrder, activeOnly);
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
                state: supplier.full_address?.state || supplier.full_address?.estado || supplier.state || '',
                observation: supplier.observation || '',
                active: supplier.active !== false,
            }));
            if (requestId !== requestSequence.current) return;
            setSuppliers(current => reset ? formatted : [...current, ...formatted]);
            setHasMore(data.length >= stockService.ITEMS_PER_PAGE);
            setPage(pageNum);
            const unknownIds = formatted.map(supplier => String(supplier.id)).filter(id => !fetchedCountIds.current.has(id));
            if (unknownIds.length) {
                void stockService.fetchSupplierProductCounts(unknownIds).then(counts => {
                    Object.keys(counts).forEach(id => fetchedCountIds.current.add(id));
                    setProductCounts(current => ({ ...current, ...counts }));
                    setProductCountErrors(current => {
                        const next = { ...current };
                        Object.keys(counts).forEach(id => delete next[id]);
                        return next;
                    });
                }).catch(countError => {
                    console.error('Não foi possível carregar a contagem de produtos dos fornecedores:', countError);
                    setProductCountErrors(current => ({ ...current, ...Object.fromEntries(unknownIds.map(id => [id, true])) }));
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
    }, [debouncedSearch, sortBy, sortOrder, activeOnly]);

    useEffect(() => { void loadSuppliers(true, 0); }, [loadSuppliers]);

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
        setProductCountErrors(current => ({ ...current, [supplierId]: false }));
        try {
            const counts = await stockService.fetchSupplierProductCounts([supplierId]);
            fetchedCountIds.current.add(supplierId);
            setProductCounts(current => ({ ...current, ...counts }));
            setProductCountErrors(current => ({ ...current, [supplierId]: false }));
        } catch (countError) {
            console.error('Não foi possível carregar a contagem de produtos do fornecedor:', countError);
            setProductCountErrors(current => ({ ...current, [supplierId]: true }));
        }
    };

    return {
        suppliers, productCounts, productCountErrors, loading, loadingMore, error, hasMore, loadMore,
        search, setSearch, sortBy, setSortBy, sortOrder, setSortOrder, activeOnly, setActiveOnly,
        reload: () => loadSuppliers(true, 0), saveSupplier, moveToTrash, retryProductCount,
    };
};
