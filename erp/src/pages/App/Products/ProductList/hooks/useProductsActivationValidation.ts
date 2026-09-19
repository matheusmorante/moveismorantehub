import Product from '@/pages/types/product.type';

export interface ErpActivationValidationResult {
    readonly isValid: boolean;
    readonly errorMessage?: string;
}

interface ProductVariationValidationItem {
    readonly sku?: string | null;
    readonly syncUnitPrice?: boolean;
    readonly unitPrice?: number;
}

/**
 * Valida os requisitos mínimos do ERP para ativar um produto ou variação.
 */
export const validateErpActivationRequirements = (
    id: string,
    products: readonly Product[],
    serverProducts: readonly Product[]
): ErpActivationValidationResult => {
    // 1. Bloqueio rigoroso para Rascunhos: não pode ativar no ERP
    if (id.includes('_')) {
        const [parentId] = id.split('_');
        const parent = serverProducts.find((p) => String(p.id) === String(parentId)) || products.find((p) => String(p.id) === String(parentId));
        const isParentDraft = Boolean(parent?.is_draft) || Boolean(parent?.isDraft);
        if (isParentDraft) {
            return {
                isValid: false,
                errorMessage: "Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP."
            };
        }
    } else {
        const targetProduct = serverProducts.find((p) => String(p.id) === String(id)) || products.find((p) => String(p.id) === String(id));
        const isDraft = Boolean(targetProduct?.is_draft) || Boolean(targetProduct?.isDraft);
        if (isDraft) {
            return {
                isValid: false,
                errorMessage: "Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP."
            };
        }
    }

    // 2. Validação de campos obrigatórios da variação
    if (id.includes('_')) {
        const [parentId, ...skuParts] = id.split('_');
        const targetSku = skuParts.join('_');
        const parent = products.find((p) => p.id === parentId);
        if (parent && parent.variations) {
            const variations = parent.variations as unknown as readonly ProductVariationValidationItem[];
            const v = variations.find((item, idx) => {
                const sku = item.sku || `${parent.sku || parent.code}-${String(idx + 1).padStart(2, '0')}`;
                return String(sku) === targetSku;
            });
            if (v) {
                const missingFields: string[] = [];
                const isVPriceValid = Boolean(v.syncUnitPrice || Number(v.unitPrice || 0) > 0 || Number(parent.unitPrice || 0) > 0);
                
                if (!(parent.description || '').trim() || (parent.description || '').trim().length < 2) {
                    missingFields.push('nome do produto no pai');
                }
                if (!isVPriceValid) {
                    missingFields.push('preço de venda');
                }
                if (!(parent.categoryIds || []).length && !parent.category) {
                    missingFields.push('categoria no pai');
                }
                if (!parent.mainSupplierId && !parent.supplierId) {
                    missingFields.push('fornecedor no pai');
                }
                if (parent.itemType === 'composition' || parent.isCombo) {
                    const comboItems = (v as any).comboItems || [];
                    if (!comboItems || comboItems.length < 2) {
                        missingFields.push('pelo menos 2 produtos componentes vinculados');
                    }
                }

                if (missingFields.length > 0) {
                    return {
                        isValid: false,
                        errorMessage: `Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar esta variação.`
                    };
                }
            }
        }
    } else {
        // 3. Validação de campos obrigatórios do produto pai / produto simples
        const productToActivate = products.find((product) => String(product.id) === String(id));
        if (productToActivate) {
            const missingFields: string[] = [];
            const isParent = productToActivate.isParent || (productToActivate.variations && productToActivate.variations.length > 0);

            if (!(productToActivate.name || productToActivate.description || '').trim() || (productToActivate.name || productToActivate.description || '').trim().length < 2) {
                missingFields.push('nome do produto');
            }
            if (!isParent && (!productToActivate.unitPrice || Number(productToActivate.unitPrice) <= 0)) {
                missingFields.push('preço de venda');
            }
            if (!(productToActivate.categoryIds || []).length && !productToActivate.category) {
                missingFields.push('categoria');
            }
            if (!productToActivate.mainSupplierId && !productToActivate.supplierId) {
                missingFields.push('fornecedor');
            }
            if (!isParent && (productToActivate.itemType === 'composition' || productToActivate.isCombo)) {
                const comboItems = productToActivate.comboItems || [];
                if (!comboItems || comboItems.length < 2) {
                    missingFields.push('pelo menos 2 produtos componentes vinculados');
                }
            }

            if (missingFields.length > 0) {
                return {
                    isValid: false,
                    errorMessage: `Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar este produto.`
                };
            }
        }
    }

    return { isValid: true };
};
