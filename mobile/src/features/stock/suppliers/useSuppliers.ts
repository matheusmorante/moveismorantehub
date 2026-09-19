import { useState, useCallback, useEffect } from 'react';
import * as stockService from '../../../services/stockService';

export const useSuppliers = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [productCounts, setProductCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadProductCounts = async () => {
        const counts = await stockService.fetchSupplierProductCounts();
        setProductCounts(counts);
    };

    const loadSuppliers = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
            void loadProductCounts();
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchSuppliers(pageNum);
            
            const formattedData = (data || []).map((supplier: any) => ({
                ...supplier,
                id: supplier.id,
                name: supplier.full_name || supplier.name || 'Fornecedor Desconhecido',
                documentNumber: supplier.cpf_cnpj || supplier.document_number || '',
                city: supplier.full_address?.city || supplier.city || '',
                state: supplier.full_address?.state || supplier.state || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
            }));

            if (isRefresh || pageNum === 0) {
                setSuppliers(formattedData);
            } else {
                setSuppliers(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            void loadSuppliers(false, nextPage);
        }
    }, [loadingMore, hasMore, loading, page, loadSuppliers]);

    useEffect(() => {
        void loadSuppliers(true, 0);
    }, [loadSuppliers]);

    const saveSupplier = async (supplierData: any) => {
        const saved = await stockService.saveSupplier(supplierData);
        void loadSuppliers(true, 0);
        return saved;
    };

    return { suppliers, productCounts, loading, loadingMore, loadMore, reload: () => loadSuppliers(true, 0), saveSupplier };
};
