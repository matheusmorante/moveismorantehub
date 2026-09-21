import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { MetaCollectionItem } from '../types';

export function useMetaCollections() {
    const [metaCollections, setMetaCollections] = useState<MetaCollectionItem[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [showMetaPanel, setShowMetaPanel] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchMetaCollections = useCallback(async () => {
        setLoadingMeta(true);
        try {
            const sets = await whatsappGraphService.listProductSets();
            setMetaCollections(sets);
        } catch (err: any) {
            toast.error('Erro ao carregar coleções da Meta: ' + err.message);
        } finally {
            setLoadingMeta(false);
        }
    }, []);

    const toggleMetaPanel = useCallback(() => {
        setShowMetaPanel(prev => {
            const next = !prev;
            if (next) {
                fetchMetaCollections();
            }
            return next;
        });
    }, [fetchMetaCollections]);

    const handleDeleteMetaCollection = useCallback(async (id: string, name: string) => {
        if (!window.confirm(`Deseja deletar a coleção "${name}" do catálogo da Meta permanentemente?`)) {
            return;
        }

        setDeletingId(id);
        try {
            await whatsappGraphService.deleteProductSet(id);
            setMetaCollections(prev => prev.filter(c => c.id !== id));
            toast.success(`Coleção "${name}" deletada!`);
        } catch (err: any) {
            toast.error('Erro ao deletar coleção: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    }, []);

    return {
        metaCollections,
        loadingMeta,
        showMetaPanel,
        deletingId,
        toggleMetaPanel,
        fetchMetaCollections,
        handleDeleteMetaCollection,
    };
}
