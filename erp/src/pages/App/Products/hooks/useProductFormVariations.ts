import { useState, useRef } from 'react';
import Product, { Variation } from '../../../types/product.type';
import { generateVariationSku, checkProductHasMoves } from '@/pages/utils/productService';
import { hasVariationAttribute } from '@/pages/utils/productVariationDefaults';
import { toast } from 'react-toastify';

export function useProductFormVariations(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
    const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
    const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
    const pendingNewVariationIdRef = useRef<string | null>(null);

    const handleSaveVariation = (updatedVar: Variation) => {
        const isDuplicate = (formData.variations || []).some(
            v => v.id !== updatedVar.id && v.sku?.toUpperCase() === updatedVar.sku?.toUpperCase()
        );
        if (isDuplicate) {
            toast.error(`O SKU "${updatedVar.sku}" já está em uso em outra variação.`);
            return;
        }

        setFormData((prev: Partial<Product>) => ({
            ...prev,
            variations: (prev.variations || []).map(v => v.id === updatedVar.id ? updatedVar : v)
        }));
        setEditingVariationId(null);
    };

    const updateVariation = (id: string, field: keyof Variation, value: any) => {
        setFormData((prev: Partial<Product>) => ({
            ...prev,
            variations: prev.variations?.map(v => v.id === id ? { ...v, [field]: value } : v)
        }));
    };

    const addVariation = () => {
        const firstVariation = formData.variations?.[0];
        if (firstVariation && !hasVariationAttribute(firstVariation)) {
            toast.info('Antes de criar outra variação, informe pelo menos um atributo na Variação 1.');
            setEditingVariationId(firstVariation.id);
            return;
        }
        const baseName = formData.name || formData.description || 'NOVA VARIAÇÃO';
        const parentCode = formData.code || '000000';
        const newSku = generateVariationSku(parentCode, formData.variations || []);

        const newVar: Variation = {
            id: crypto.randomUUID(),
            name: baseName,
            sku: newSku,
            unitPrice: formData.unitPrice || 0,
            costPrice: formData.costPrice || 0,
            stock: 0,
            images: [],
            active: true,
            syncUnitPrice: true,
            syncPromoPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            syncDimensions: true,
            syncWidth: true,
            syncHeight: true,
            syncDepth: true,
            syncWeight: true,
            syncIpi: true,
            syncFreight: true,
            attributes: [],
            comboItems: []
        };
        setFormData((prev: Partial<Product>) => ({
            ...prev,
            variations: [...(prev.variations || []), newVar],
            hasVariations: true
        }));
        pendingNewVariationIdRef.current = newVar.id;
        setEditingVariationId(newVar.id);
    };

    const removeVariation = async (id: string) => {
        const variationIndex = formData.variations?.findIndex((variation) => variation.id === id) ?? -1;
        if (variationIndex === 0) {
            toast.info('A Variação 1 é obrigatória e não pode ser removida.');
            return;
        }
        if (formData.id) {
            try {
                const hasMoves = await checkProductHasMoves(formData.id, id);
                if (hasMoves) {
                    toast.error('Esta variação possui movimentações de estoque vinculadas e não pode ser removida para preservar o histórico.');
                    return;
                }
            } catch (error) {
                console.error('Erro ao verificar movimentações da variação:', error);
            }
        }

        setFormData((prev: Partial<Product>) => {
            const filtered = prev.variations?.filter(v => v.id !== id);
            return {
                ...prev,
                variations: filtered,
                hasVariations: true
            };
        });
    };

    const generateBulkVariations = (options: { name: string; values: string[]; showName: boolean }[]) => {
        const firstVariation = formData.variations?.[0];
        if (firstVariation && !hasVariationAttribute(firstVariation)) {
            toast.info('Informe um atributo na Variação 1 antes de gerar outras variações.');
            setEditingVariationId(firstVariation.id);
            return;
        }
        const attributes = options.filter(o => o.name && o.values.length > 0);
        if (attributes.length === 0) return;

        let combinations: any[] = [{}];

        attributes.forEach(attr => {
            const newCombinations: any[] = [];
            combinations.forEach(combo => {
                attr.values.forEach(val => {
                    newCombinations.push({
                        ...combo,
                        [attr.name]: { value: val, showName: attr.showName }
                    });
                });
            });
            combinations = newCombinations;
        });

        const newVars: Variation[] = combinations.map((combo, idx) => {
            const attributeValues = attributes.map(attr => {
                const attrData = combo[attr.name];
                return String(attrData.value);
            }).join(' ');

            const parentName = formData.name || formData.description || '';
            const name = [parentName, attributeValues].filter(Boolean).join(' ');
            const parentCode = formData.code || '000000';
            const finalSku = generateVariationSku(parentCode, formData.variations || [], idx);

            return {
                id: crypto.randomUUID(),
                name,
                sku: finalSku,
                unitPrice: formData.unitPrice || 0,
                costPrice: formData.costPrice || 0,
                stock: 0,
                syncUnitPrice: true,
                syncPromoPrice: true,
                syncCostPrice: true,
                syncDescription: true,
                images: [],
                active: true,
                attributes: attributes.map(attr => ({
                    name: attr.name,
                    value: String(combo[attr.name].value),
                    showName: combo[attr.name].showName
                })),
                comboItems: []
            };
        });

        const existingSkus = new Set((formData.variations || []).map(v => v.sku?.toUpperCase()));
        const deduplicatedNewVars = newVars.map(v => {
            let currentSku = v.sku;
            let counter = 1;
            while (existingSkus.has(currentSku.toUpperCase())) {
                const suffix = `-${counter}`;
                currentSku = v.sku.substring(0, 50 - suffix.length) + suffix;
                counter++;
            }
            existingSkus.add(currentSku.toUpperCase());
            return { ...v, sku: currentSku };
        });

        setFormData((prev: Partial<Product>) => ({
            ...prev,
            variations: [...(prev.variations || []), ...deduplicatedNewVars],
            hasVariations: true
        }));
        toast.success(`${newVars.length} variações geradas com sucesso!`);
    };

    const regenerateAllVariationSkus = () => {
        setFormData((prev: Partial<Product>) => {
            if (!prev.variations) return prev;

            const existingSkus = new Set<string>();
            const newVariations = prev.variations.map((v, idx) => {
                const isGeneric = !v.sku || v.sku.startsWith('NEW-VAR') || v.sku.includes('-NEW');
                if (!isGeneric) {
                    existingSkus.add(v.sku.toUpperCase());
                    return v;
                }

                let base = prev.code || 'PROD';
                let suffix = v.name ? v.name.toUpperCase().replace(/\s+/g, '') : `V${idx + 1}`;
                let newSku = `${base}-${suffix}`;
                if (newSku.length > 50) newSku = newSku.substring(0, 50);

                let counter = 1;
                let candidate = newSku;
                while (existingSkus.has(candidate.toUpperCase())) {
                    const countStr = `-${counter}`;
                    candidate = newSku.substring(0, 50 - countStr.length) + countStr;
                    counter++;
                }

                existingSkus.add(candidate.toUpperCase());
                return { ...v, sku: candidate };
            });
            return { ...prev, variations: newVariations };
        });
        toast.info('SKUs das variações regenerados com exclusividade.');
    };

    return {
        editingVariationComboId,
        setEditingVariationComboId,
        editingVariationId,
        setEditingVariationId,
        pendingNewVariationIdRef,
        handleSaveVariation,
        updateVariation,
        addVariation,
        removeVariation,
        generateBulkVariations,
        regenerateAllVariationSkus
    };
}
