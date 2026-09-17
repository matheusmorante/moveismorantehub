import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { moveVariationToFamily } from '@/pages/utils/productService';
import Product from '@/pages/types/product.type';
import { Family, Attribute, toAttributes, hasSameAttributes, familyName } from './utils';

export const useMoveVariationFamily = (
    variation: (Product & { readonly variationId?: string }) | null,
    onMoved: () => void,
    onClose: () => void
) => {
    const [families, setFamilies] = useState<readonly Family[]>([]);
    const [targetFamilyId, setTargetFamilyId] = useState('');
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [hasConflict, setHasConflict] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [isOnlyVariation, setIsOnlyVariation] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!variation) return;

        setTargetFamilyId('');
        setAttributes(toAttributes(variation.attributes));
        setHasConflict(false);
        setCountdown(5);
        setIsOnlyVariation(false);

        if (variation.parentId) {
            supabase
                .from('product_variations')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', variation.parentId)
                .then(({ count }) => {
                    if (count === 1) setIsOnlyVariation(true);
                });
        }

        let query = supabase
            .from('products')
            .select('id, name, description, code')
            .eq('deleted', false)
            .not('code', 'is', null)
            .neq('code', '')
            .order('name', { ascending: true });
            
        if (variation.parentId) query = query.neq('id', variation.parentId);
        
        query.then(({ data, error }) => {
            if (error) {
                toast.error('Não foi possível carregar os produtos pai.');
                return;
            }
            setFamilies((data || []) as readonly Family[]);
        });
    }, [variation]);

    useEffect(() => {
        const validAttributes = attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim());
        if (!variation || !targetFamilyId || validAttributes.length === 0) {
            setHasConflict(false);
            return;
        }
        let active = true;
        supabase
            .from('product_variations')
            .select('id, attributes')
            .eq('product_id', targetFamilyId)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível validar as variações do produto pai.');
                    setHasConflict(true);
                    return;
                }
                setHasConflict(
                    (data || []).some((candidate) =>
                        hasSameAttributes(validAttributes, toAttributes(candidate.attributes).filter(a => a.name.trim() && a.value.trim()))
                    )
                );
            });
        return () => {
            active = false;
        };
    }, [variation, targetFamilyId, attributes]);

    useEffect(() => {
        if (!variation || !targetFamilyId || hasConflict || saving) {
            setCountdown(5);
            return;
        }
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [variation, targetFamilyId, hasConflict, saving, countdown]);

    const updateAttribute = useCallback((index: number, field: 'name' | 'value', value: string) => {
        setAttributes((current) =>
            current.map((attribute, attributeIndex) =>
                attributeIndex === index ? { ...attribute, [field]: value } : attribute
            )
        );
    }, []);
    
    const addAttribute = useCallback(() => {
        setAttributes([{ name: '', value: '' }]);
    }, []);

    const handleConfirm = useCallback(async () => {
        const selectedFamily = families.find((family) => family.id === targetFamilyId);
        if (!selectedFamily || !variation?.variationId) return;
        const validAttributes = attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim());

        try {
            setSaving(true);
            const canonicalAttributes = await Promise.all(
                validAttributes.map(async (attribute) => {
                    const stored = await ensureAttributeValue(attribute.name, attribute.value);
                    return { ...attribute, ...stored };
                })
            );
            const newName = [familyName(selectedFamily), ...canonicalAttributes.map((attribute) => attribute.value)]
                .filter(Boolean)
                .join(' ');

            let imagesToMove = variation.images || [];

            if (imagesToMove.length === 0 && variation.parentId) {
                // Se a variação não tem fotos explícitas, herda as fotos do pai antigo antes de mover
                const { data: oldParentImages } = await supabase
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', variation.parentId);
                if (oldParentImages && oldParentImages.length > 0) {
                    imagesToMove = oldParentImages.map((img: any) => img.image_url);
                }
            }

            const result = await moveVariationToFamily(
                variation.variationId,
                selectedFamily.id,
                canonicalAttributes,
                newName,
                imagesToMove,
                variation.parentId
            );

            if (result?.sourceParentRemoved) {
                toast.success(`Variação movida (novo SKU: ${result.newSku}). O produto pai antigo ficou sem variações e foi removido.`);
            } else {
                toast.success(`Variação movida para o novo produto pai (SKU: ${result?.newSku || 'gerado'}). O ID foi preservado.`);
            }
            onMoved();
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Não foi possível mover o produto.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [families, targetFamilyId, variation, attributes, onMoved, onClose]);

    return {
        families,
        targetFamilyId,
        setTargetFamilyId,
        attributes,
        updateAttribute,
        addAttribute,
        hasConflict,
        countdown,
        isOnlyVariation,
        saving,
        handleConfirm
    };
};
