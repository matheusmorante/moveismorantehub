import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { getSettings } from '@/pages/utils/settingsService';
import { buildChannelCatalogSyncPayload } from '../../channelCatalogRows';
import { VariationRow, CatalogCollectionItem, ChannelFilter } from '../types';
import {
    fetchLightweightCollections,
    fetchPaginatedChannelProducts,
    persistVariationSync,
} from '../services/channelCatalogService';

const ITEMS_PER_PAGE = 30;

export function useChannelCatalog() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rows, setRows] = useState<VariationRow[]>([]);
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState<ChannelFilter>('all');
    const [filterCollection, setFilterCollection] = useState<string>('all');
    const [apiError, setApiError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [catalogCollections, setCatalogCollections] = useState<CatalogCollectionItem[]>([]);

    useEffect(() => {
        fetchLightweightCollections().then(setCatalogCollections);
    }, []);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        setApiError(null);
        try {
            const settings = getSettings();
            if (!settings.whatsappConfig?.accessToken || !settings.whatsappConfig?.catalogId) {
                setApiError('Configurações do WhatsApp incompletas. Vá em Configurações > WhatsApp para ajustar.');
            }

            const result = await fetchPaginatedChannelProducts({
                page,
                itemsPerPage: ITEMS_PER_PAGE,
                search,
                filterChannel,
                filterCollection,
            });

            setRows(result.rows);
            setTotalCount(result.totalCount);
            setCurrentPage(page);
            setTotalPages(Math.max(1, Math.ceil(result.totalCount / ITEMS_PER_PAGE)));
        } catch (error: any) {
            toast.error('Erro ao carregar catálogo: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [search, filterChannel, filterCollection]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const updateRowLocal = (varId: string, patch: Partial<VariationRow>) => {
        setRows(prev => prev.map(r => (r.varId === varId ? { ...r, ...patch } : r)));
    };

    const handleToggleWhatsAppSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappSync;
        setActionLoading(row.varId + '_wa');
        try {
            if (newValue) {
                await whatsappGraphService.syncProductToCatalog(buildChannelCatalogSyncPayload(row), 'UPDATE');
            } else {
                await whatsappGraphService.deleteProductFromCatalog(row.varSku || row.varId);
            }
            await persistVariationSync(row, 'whatsappSync', newValue);
            updateRowLocal(row.varId, { varWhatsappSync: newValue, varLastSync: new Date().toISOString() });
            toast.success(newValue ? 'Variação publicada no WhatsApp!' : 'Variação removida do WhatsApp!');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao atualizar visibilidade');
            if (error.message?.includes('Bloqueado')) setApiError(error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleAutoSync = async (row: VariationRow) => {
        const newValue = !row.varWhatsappAutoSync;
        setActionLoading(row.varId + '_auto');
        try {
            await persistVariationSync(row, 'whatsappAutoSync', newValue);
            updateRowLocal(row.varId, { varWhatsappAutoSync: newValue });
            toast.success(newValue ? 'Auto-Sync ativado!' : 'Auto-Sync desativado.');
        } catch (error: any) {
            toast.error('Erro ao alternar auto-sync: ' + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSyncAllActive = async () => {
        const toSync = rows.filter(r => r.varWhatsappSync);
        if (toSync.length === 0) {
            toast.info('Nenhuma variação marcada para sincronizar.');
            return;
        }
        if (!window.confirm(`Deseja atualizar ${toSync.length} variações no WhatsApp?`)) return;

        setLoading(true);
        let count = 0;
        let errors = 0;
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

    return {
        state: {
            loading,
            actionLoading,
            rows,
            search,
            filterChannel,
            filterCollection,
            apiError,
            currentPage,
            totalPages,
            totalCount,
            catalogCollections,
        },
        actions: {
            setSearch,
            setFilterChannel,
            setFilterCollection,
            fetchData,
            handleToggleWhatsAppSync,
            handleToggleAutoSync,
            handleSyncAllActive,
        },
    };
}
