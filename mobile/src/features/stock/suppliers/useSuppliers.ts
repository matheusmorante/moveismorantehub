import { useState, useCallback, useEffect } from 'react';
import * as stockService from '../../../services/stockService';

export const useSuppliers = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadSuppliers = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchSuppliers(pageNum);
            
            const formattedData = (data || []).map((supplier: any) => ({
                id: supplier.id,
                name: supplier.name || 'Fornecedor Desconhecido',
                documentNumber: supplier.document_number || supplier.cnpj_cpf || '',
                city: supplier.city || '',
                state: supplier.state || '',
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

    return { suppliers, loading, loadingMore, loadMore, reload: () => loadSuppliers(true, 0) };
};
