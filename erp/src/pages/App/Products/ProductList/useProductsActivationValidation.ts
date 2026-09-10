import Product from '../../../../types/product.type';
import { toast } from 'react-toastify';

/**
 * Valida os requisitos mínimos do ERP para ativar um produto ou variação
 */
export const validateErpActivationRequirements = (
    id: string,
    products: Product[],
    serverProducts: Product[]
): { isValid: boolean; errorMessage?: string } => {
    // 1. Bloqueio rigoroso para Rascunhos: não pode ativar no ERP
    if (id.includes('_')) {
        const [parentId] = id.split('_');
        const parent = serverProducts.find(p => String(p.id) === String(parentId)) || products.find(p => String(p.id) === String(parentId));
        const isParentDraft = Boolean(parent?.is_draft) || parent?.status === 'draft' || Boolean((parent as any)?.isDraft);
        if (isParentDraft) {
            return {
                isValid: false,
                errorMessage: "Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP."
            };
        }
    } else {
        const targetProduct = serverProducts.find(p => String(p.id) === String(id)) || products.find(p => String(p.id) === String(id));
        const isDraft = Boolean(targetProduct?.is_draft) || targetProduct?.status === 'draft' || Boolean((targetProduct as any)?.isDraft);
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
        const parent = products.find(p => p.id === parentId);
        if (parent && parent.variations) {
            const v = parent.variations.find((item: any, idx: number) => {
                const sku = item.sku || `${parent.sku || parent.code}-${String(idx + 1).padStart(2, '0')}`;
                return String(sku) === targetSku;
            });
            if (v) {
                const missingFields: string[] = [];
                const isVPriceValid = (v.syncUnitPrice || Number(v.unitPrice || 0) > 0 || Number(parent.unitPrice || 0) > 0);
                
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
        const productToActivate = products.find(product => String(product.id) === String(id));
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
