import { useState, useCallback, useEffect } from 'react';
import { InventorySession } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import { listLocalInventoryDrafts } from '../../../../services/sqlite/inventoryDrafts';

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

        // 1. Carrega rascunhos locais do SQLite (disponíveis 100% offline)
        let localDraftSessions: InventorySession[] = [];
        if (pageNum === 0) {
            try {
                const localDrafts = await listLocalInventoryDrafts();
                localDraftSessions = localDrafts.map(d => ({
                    id: d.id,
                    name: d.name,
                    status: d.status || 'in_progress',
                    created_at: d.updatedAt,
                    updated_at: d.updatedAt,
                    items_count: d.items.length,
                    productsCount: d.items.length,
                    adjustmentsCount: 0,
                    reversedCount: 0,
                    inventoryCode: d.code,
                    responsibleName: 'Armazenado no aparelho',
                }));
                setSessions(localDraftSessions);
                setLoading(false);
            } catch (e) {
                console.warn('[SQLite] Erro ao listar rascunhos locais:', e);
            }
        }

        try {
            const data = await stockService.fetchInventorySessions(pageNum);
            
            const formattedData = (data || []).map((session: any) => ({
                id: session.id,
                name: session.name || `Inventário #${session.id.split('-')[0]}`,
                status: session.status || 'in_progress',
                created_at: session.created_at,
                updated_at: session.updated_at,
                items_count: session.items_count || 0,
                productsCount: session.productsCount || 0,
                adjustmentsCount: session.adjustmentsCount || 0,
                reversedCount: session.reversedCount || 0,
                inventoryCode: session.inventoryCode,
                responsibleName: session.responsibleName,
            }));

            if (isRefresh || pageNum === 0) {
                // Mescla rascunhos locais no topo, deduplicando por ID
                const completedRemoteIds = new Set(formattedData.filter((s: any) => s.status === 'completed').map((s: any) => s.id));
                const localIds = new Set(localDraftSessions.map(s => s.id));
                const activeLocal = localDraftSessions.filter(d => !completedRemoteIds.has(d.id));
                setSessions([...activeLocal, ...formattedData.filter((s: any) => s.status === 'completed' || !localIds.has(s.id))]);
            } else {
                setSessions(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch inventory sessions:', err);
            // Em caso de falha de conexão (offline), exibe os rascunhos locais salvos no aparelho!
            if (pageNum === 0 && localDraftSessions.length > 0) {
                setSessions(localDraftSessions);
            }
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
