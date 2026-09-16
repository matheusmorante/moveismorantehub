import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { fetchPaginatedCatalog, persistVariationSync } from '../services/catalogService';
import { VariationRow } from '../types';
import { buildChannelCatalogCollections, buildChannelCatalogSyncPayload, filterChannelCatalogRows } from '../../channelCatalogRows';

export function useCatalog() {
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [rows, setRows] = useState<VariationRow[]>([]);
    
    // Pagination and Filters
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 30;
    
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'ecommerce'>('all');
    const [filterCollection, setFilterCollection] = useState<string>('all');
    const [apiError, setApiError] = useState<string | null>(null);
    
    // Meta Collections
    const [metaCollections, setMetaCollections] = useState<{ id: string; name: string; filter: string }[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [showMetaPanel, setShowMetaPanel] = useState(false);

    const fetchData = useCallback(async (currentPage: number) => {
        setLoading(true);
        setApiError(null);
        try {
            const { rows: fetchedRows, totalCount: count, apiError: err } = await fetchPaginatedCatalog(currentPage, limit);
            setRows(fetchedRows);
            setTotalCount(count);
            if (err) setApiError(err);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    // Initial fetch & page change
    useEffect(() => {
        fetchData(page);
    }, [fetchData, page]);

    const fetchMetaCollections = async () => {
        setLoadingMeta(true);
        try {
            const sets = await whatsappGraphService.listProductSets();
            setMetaCollections(sets);
        } catch (err: any) {
            toast.error("Erro ao carregar coleções da Meta: " + err.message);
        } finally {
            setLoadingMeta(false);
        }
    };

    const handleDeleteMetaCollection = async (id: string, name: string) => {
        if (!window.confirm(`Deseja deletar a coleção "${name}" do catálogo da Meta permanentemente?`)) return;
        setIsActionLoading('meta_' + id);
        try {
            await whatsappGraphService.deleteProductSet(id);
            setMetaCollections(prev => prev.filter(c => c.id !== id));
            toast.success(`Coleção "${name}" deletada!`);
        } catch (err: any) {
            toast.error("Erro ao deletar coleção: " + err.message);
        } finally {
            setIsActionLoading(null);
        }
    };

    const updateRowLocal = (varId: string, patch: Partial<VariationRow>) => {
        setRows(prev => prev.map(r => r.varId === varId ? { ...r, ...patch } : r));
    };

    const handleToggleWhatsAppSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappSync;
        setIsActionLoading(row.varId + '_wa');
        try {
            if (newValue) {
                await whatsappGraphService.syncProductToCatalog(buildChannelCatalogSyncPayload(row), 'UPDATE');
            } else {
                await whatsappGraphService.deleteProductFromCatalog(row.varSku || row.varId);
            }
            await persistVariationSync(row, 'whatsappSync', newValue);
            updateRowLocal(row.varId, { varWhatsappSync: newValue, varLastSync: new Date().toISOString() });
            toast.success(newValue ? "Variação publicada no WhatsApp!" : "Variação removida do WhatsApp!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar visibilidade");
            if (error.message?.includes("Bloqueado")) setApiError(error.message);
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleToggleAutoSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappAutoSync;
        setIsActionLoading(row.varId + '_auto');
        try {
            await persistVariationSync(row, 'whatsappAutoSync', newValue);
            updateRowLocal(row.varId, { varWhatsappAutoSync: newValue });
            toast.success(newValue ? "Auto-Sync ativado!" : "Auto-Sync desativado.");
        } catch (error: any) {
            toast.error("Erro ao alternar auto-sync");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleSyncAllActive = async () => {
        const toSync = rows.filter(r => r.varWhatsappSync);
        if (toSync.length === 0) { toast.info("Nenhuma variação marcada para sincronizar."); return; }
        if (!window.confirm(`Deseja atualizar ${toSync.length} variações no WhatsApp?`)) return;

        setLoading(true);
        let count = 0, errors = 0;
        for (const r of toSync) {
            try {
                await whatsappGraphService.syncProductToCatalog(buildChannelCatalogSyncPayload(r), 'UPDATE');
                await persistVariationSync(r, 'whatsappSync', true);
                updateRowLocal(r.varId, { varLastSync: new Date().toISOString() });
                count++;
            } catch (err) {
                console.error(`Erro ao sincronizar ${r.varName}:`, err);
                errors++;
            }
        }
        setLoading(false);
        if (count > 0) toast.success(`${count} variações atualizadas!`);
        if (errors > 0) toast.error(`${errors} variações falharam.`);
    };

    const collections = useMemo(() => buildChannelCatalogCollections(rows), [rows]);
    const filteredRows = useMemo(() => filterChannelCatalogRows(rows, search, filterChannel, filterCollection), [rows, search, filterChannel, filterCollection]);

    return {
        state: {
            loading, isActionLoading, rows, page, totalCount, limit,
            search, filterChannel, filterCollection, apiError,
            metaCollections, loadingMeta, showMetaPanel,
            collections, filteredRows
        },
        actions: {
            setPage, setSearch, setFilterChannel, setFilterCollection, setShowMetaPanel,
            fetchData, fetchMetaCollections, handleDeleteMetaCollection,
            handleToggleWhatsAppSync, handleToggleAutoSync, handleSyncAllActive
        }
    };
}
