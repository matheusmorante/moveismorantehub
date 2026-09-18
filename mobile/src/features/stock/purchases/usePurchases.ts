import { useState, useCallback, useEffect } from 'react';
import * as stockService from '../../../services/stockService';

export const usePurchases = () => {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadPurchases = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchPurchases(pageNum);
            
            const formattedData = (data || []).map((purchase: any) => ({
                id: purchase.id,
                supplierName: purchase.supplierName || 'Fornecedor Desconhecido',
                totalValue: purchase.total_amount || purchase.total_value || 0,
                status: purchase.status || 'draft',
                issueDate: purchase.created_at
            }));

            if (isRefresh || pageNum === 0) {
                setPurchases(formattedData);
            } else {
                setPurchases(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch purchases:', err);
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
            void loadPurchases(false, nextPage);
        }
    }, [loadingMore, hasMore, loading, page, loadPurchases]);

    useEffect(() => {
        void loadPurchases(true, 0);
    }, [loadPurchases]);

    return { purchases, loading, loadingMore, loadMore, reload: () => loadPurchases(true, 0) };
};
