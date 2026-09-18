import { useState, useCallback, useEffect } from 'react';
import * as stockService from '../../../services/stockService';

export const useReceipts = () => {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadReceipts = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchReceipts(pageNum);
            
            const formattedData = (data || []).map((receipt: any) => ({
                id: receipt.id,
                supplierName: receipt.supplierName || receipt.supplier_name || 'Fornecedor',
                status: receipt.status || 'draft',
                created_at: receipt.created_at,
                received_at: receipt.received_at,
                invoiceNumber: receipt.invoice_number || '',
                totalValue: receipt.totalValue || receipt.total_value || 0,
                items: Array.isArray(receipt.items) ? receipt.items : [],
            }));

            if (isRefresh || pageNum === 0) {
                setReceipts(formattedData);
            } else {
                setReceipts(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch receipts:', err);
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
            void loadReceipts(false, nextPage);
        }
    }, [loadingMore, hasMore, loading, page, loadReceipts]);

    useEffect(() => {
        void loadReceipts(true, 0);
    }, [loadReceipts]);

    return { receipts, loading, loadingMore, loadMore, reload: () => loadReceipts(true, 0) };
};
