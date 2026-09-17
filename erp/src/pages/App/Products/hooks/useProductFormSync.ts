import { useEffect } from 'react';
import Product from '@/pages/types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';

interface UseProductFormSyncParams {
    readonly formData: Partial<Product>;
    readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
}

/**
 * Hook responsável pela sincronização contínua de campos computados e herdados no formulário de produtos:
 * 1. Cálculo do preço final de compra (custo + IPI + frete).
 * 2. Propagação de campos herdados do produto pai para as variações (preço, descrição, dimensões, fiscal).
 * 3. Agregação dos valores das variações filhas de volta para o produto pai (estoque total e custo médio).
 */
export function useProductFormSync({ formData, setFormData }: UseProductFormSyncParams): void {
    // 1. Cálculo do preço final de compra
    useEffect(() => {
        let final = formData.costPrice || 0;
        if (formData.ipiPercent) {
            if (formData.ipiType === 'fixed') {
                final += formData.ipiPercent;
            } else {
                final += (formData.costPrice || 0) * (formData.ipiPercent / 100);
            }
        }
        if (formData.freightCost) {
            if (formData.freightType === 'percentage') {
                final += (formData.costPrice || 0) * (formData.freightCost / 100);
            } else {
                final += formData.freightCost;
            }
        }
        if (Math.abs(final - (formData.finalPurchasePrice || 0)) > 0.01) {
            setFormData(prev => ({ ...prev, finalPurchasePrice: final }));
        }
    }, [formData.costPrice, formData.ipiPercent, formData.ipiType, formData.freightCost, formData.freightType, formData.finalPurchasePrice, setFormData]);

    // 2. Propagação de campos herdados (Pai -> Variações)
    useEffect(() => {
        if (!formData.variations?.length) return;

        const nextVariations = formData.variations.map(v => {
            let updated = false;
            const newV = { ...v };

            const inherit = <K extends keyof typeof newV>(field: K, enabled: boolean, value: typeof newV[K]) => {
                if (enabled && newV[field] !== value) {
                    newV[field] = value;
                    updated = true;
                }
            };

            if (v.syncUnitPrice && v.unitPrice !== formData.unitPrice) {
                newV.unitPrice = formData.unitPrice || 0;
                updated = true;
            }
            if (v.syncCostPrice && v.costPrice !== formData.costPrice) {
                newV.costPrice = formData.costPrice || 0;
                updated = true;
            }
            if (v.syncPromoPrice !== false && v.promoPrice !== formData.promoPrice) {
                newV.promoPrice = formData.promoPrice;
                updated = true;
            }

            const variationName = computeVariationName(
                formData.name || formData.description || '',
                v.attributes || []
            ) || 'Variação';

            if (newV.name !== variationName) {
                newV.name = variationName;
                updated = true;
            }

            inherit('description', Boolean(v.syncDescription), formData.description);
            inherit('width', Boolean(v.syncWidth), formData.width);
            inherit('height', Boolean(v.syncHeight), formData.height);
            inherit('depth', Boolean(v.syncDepth), formData.depth);
            inherit('weight', Boolean(v.syncWeight), formData.weight);
            inherit('condition', Boolean(v.syncCondition), formData.condition);

            if (v.syncFiscal && JSON.stringify(v.fiscal || {}) !== JSON.stringify(formData.fiscal || {})) {
                newV.fiscal = formData.fiscal ? { ...formData.fiscal } : undefined;
                updated = true;
            }

            return updated ? newV : v;
        });

        if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
            setFormData(prev => ({ ...prev, variations: nextVariations }));
        }
    }, [
        formData.name,
        formData.description,
        formData.unitPrice,
        formData.costPrice,
        formData.promoPrice,
        formData.width,
        formData.height,
        formData.depth,
        formData.weight,
        formData.condition,
        formData.fiscal,
        formData.variations,
        setFormData
    ]);

    // 3. Agregação dos valores das variações (Filhas -> Pai: Estoque e Custo Médio)
    useEffect(() => {
        if (!formData.hasVariations || !formData.variations?.length) return;

        const totalStock = formData.variations.reduce((acc, v) => acc + (v.stock || 0), 0);

        const shouldUpdateStock = formData.stock !== totalStock;

        if (shouldUpdateStock) {
            setFormData(prev => ({ 
                ...prev, 
                stock: totalStock
            }));
        }
    }, [formData.variations, formData.hasVariations, formData.stock, setFormData]);
}
