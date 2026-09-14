export type ProductFormTabKey = 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'technical' | 'fiscal';

export const PRODUCT_REQUIREMENT_FIELD_MAP: Record<string, { tab: ProductFormTabKey; fieldId: string }> = {
    description: { tab: 'geral', fieldId: 'field-product-description' },
    name: { tab: 'geral', fieldId: 'field-product-description' },
    code: { tab: 'geral', fieldId: 'field-product-code' },
    sku: { tab: 'geral', fieldId: 'field-product-code' },
    marketplaceTitle: { tab: 'geral', fieldId: 'field-marketplace-title' },
    title: { tab: 'geral', fieldId: 'field-marketplace-title' },
    categories: { tab: 'geral', fieldId: 'field-product-categories' },
    unitPrice: { tab: 'estoque', fieldId: 'field-unit-price' },
    supplier: { tab: 'estoque', fieldId: 'field-main-supplier' },
    mainSupplierId: { tab: 'estoque', fieldId: 'field-main-supplier' },
    stock: { tab: 'estoque', fieldId: 'field-stock' },
    costPrice: { tab: 'estoque', fieldId: 'field-cost-price' },
    images: { tab: 'ecommerce', fieldId: 'field-product-images' },
    dimensions: { tab: 'technical', fieldId: 'field-product-dimensions' },
    width: { tab: 'technical', fieldId: 'field-product-dimensions' },
    height: { tab: 'technical', fieldId: 'field-product-dimensions' },
    depth: { tab: 'technical', fieldId: 'field-product-dimensions' },
    ncm: { tab: 'fiscal', fieldId: 'field-product-ncm' }
};

/**
 * Rola suavemente até o campo com pendência, foca no input e ativa animação temporária de destaque.
 */
export function scrollToRequirementField(
    fieldKey: string,
    setActiveTab: (tab: ProductFormTabKey) => void,
    onBeforeNavigate?: () => void
): void {
    const target = PRODUCT_REQUIREMENT_FIELD_MAP[fieldKey];
    if (!target) return;

    if (onBeforeNavigate) {
        onBeforeNavigate();
    }
    setActiveTab(target.tab);

    setTimeout(() => {
        const el = document.getElementById(target.fieldId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = el.querySelector('input, select, textarea') as HTMLElement;
            if (input && typeof input.focus === 'function') {
                input.focus();
            }
            el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2', 'border-amber-500', 'animate-pulse', 'bg-amber-50/50', 'dark:bg-amber-950/20');
            setTimeout(() => {
                el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2', 'border-amber-500', 'animate-pulse', 'bg-amber-50/50', 'dark:bg-amber-950/20');
            }, 3000);
        }
    }, 150);
}
