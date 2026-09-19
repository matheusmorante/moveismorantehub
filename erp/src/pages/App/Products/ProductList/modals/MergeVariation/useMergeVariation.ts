import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mergeVariationIntoCanonical } from '@/pages/utils/productService';
import { VariationOption, MergeVariationModalProps } from '../../MergeVariationModal';

export const useMergeVariation = (
    variation: MergeVariationModalProps['variation'], 
    onMerged: () => void,
    onClose: () => void
) => {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<readonly VariationOption[]>([]);
    const [target, setTarget] = useState<VariationOption | null>(null);
    const [saving, setSaving] = useState(false);

    const sourceId = String(variation?.variationId || variation?.id || '');

    useEffect(() => {
        if (variation) {
            setQuery('');
            setOptions([]);
            setTarget(null);
            setSaving(false);
        }
    }, [variation]);

    useEffect(() => {
        if (!variation) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) {
                setQuery('');
                setOptions([]);
                setTarget(null);
                setSaving(false);
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [variation, saving, onClose]);

    useEffect(() => {
        if (!variation || query.trim().length < 2 || target) {
            setOptions([]);
            return;
        }
        let active = true;
        const term = query.trim().replace(/"/g, '""');
        
        let dbQuery = supabase.from('product_variations')
            .select('id, name, sku, product:products!inner(name, description, supplier_id)')
            .neq('id', sourceId)
            .is('merged_to_variation_id', null)
            .or(`name.ilike."%${term}%",sku.ilike."%${term}%"`);
            
        if (variation.supplierId) {
            dbQuery = dbQuery.eq('products.supplier_id', variation.supplierId);
        }
        
        dbQuery.limit(12)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível buscar variações.');
                    return;
                }
                setOptions((data || []) as unknown as readonly VariationOption[]);
            });

        return () => {
            active = false;
        };
    }, [variation, query, target, sourceId]);

    const confirm = useCallback(async () => {
        if (!target || !sourceId || saving) return;
        try {
            setSaving(true);
            const result = await mergeVariationIntoCanonical(sourceId, target.id);
            toast.success(`Variação mesclada. ${result.transferredSupplierIds.length} fornecedor(es) exclusivo(s) foram incorporados ao canônico.`);
            onMerged();
            setQuery('');
            setOptions([]);
            setTarget(null);
            setSaving(false);
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Não foi possível mesclar as variações.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [target, sourceId, saving, onMerged, onClose]);

    const handleCancel = useCallback(() => {
        setQuery('');
        setOptions([]);
        setTarget(null);
        setSaving(false);
        onClose();
    }, [onClose]);

    return {
        query,
        setQuery,
        options,
        setOptions,
        target,
        setTarget,
        saving,
        sourceId,
        confirm
    };
};
