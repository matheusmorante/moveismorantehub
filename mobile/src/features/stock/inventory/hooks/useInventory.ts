import { useState, useCallback, useEffect } from 'react';
import { InventorySession } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';

export const useInventory = () => {
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadSessions = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchInventorySessions(pageNum);
            
            const formattedData = (data || []).map((session: any) => ({
                id: session.id,
                name: session.name || `Inventário #${session.id.split('-')[0]}`,
                status: session.status || 'in_progress',
                created_at: session.created_at,
                updated_at: session.updated_at,
                items_count: session.items_count || 0
            }));

            if (isRefresh || pageNum === 0) {
                setSessions(formattedData);
            } else {
                setSessions(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch inventory sessions:', err);
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
            void loadSessions(false, nextPage);
        }
    }, [loadingMore, hasMore, loading, page, loadSessions]);

    useEffect(() => {
        void loadSessions(true, 0);
    }, [loadSessions]);

    return { sessions, loading, loadingMore, loadMore, reload: () => loadSessions(true, 0) };
};
