import Product, { Variation } from '../types/product.type';

export const isDefaultVariation = (_variation: Variation, index: number) => index === 0;

export const hasVariationAttribute = (variation?: Variation | any): boolean => {
    if (!variation) return false;

    // 1. Array de atributos: [{ name: 'Cor', value: 'Azul' }, ...]
    if (Array.isArray(variation.attributes)) {
        if (variation.attributes.some((attr: any) => {
            if (!attr) return false;
            const name = attr.name || attr.attribute || attr.key || '';
            const val = attr.value || attr.val || '';
            return String(name).trim().length > 0 && String(val).trim().length > 0;
        })) {
            return true;
        }
    }

    // 2. Formato string (JSON ou texto)
    if (typeof variation.attributes === 'string' && variation.attributes.trim()) {
        try {
            const parsed = JSON.parse(variation.attributes);
            return hasVariationAttribute({ ...variation, attributes: parsed });
        } catch {
            if (variation.attributes.trim().length > 0) return true;
        }
    }

    // 3. Formato objeto dicionário: { "Cor": "Azul", "Tamanho": "M" }
    if (typeof variation.attributes === 'object' && variation.attributes !== null) {
        const entries = Object.entries(variation.attributes);
        if (entries.some(([k, v]) => String(k).trim().length > 0 && String(v).trim().length > 0)) {
            return true;
        }
    }

    // 4. Fallback: Se a variação possui nome/displayName preenchido de forma customizada
    if (variation.name && typeof variation.name === 'string' && variation.name.trim().length > 0) {
        return true;
    }

    return false;
};

export const computeVariationName = (parentName: string, attributes: Array<{ name?: string; value?: string }> | Record<string, any> | string): string => {
    const cleanParent = parentName ? parentName.trim() : '';
    let attrValuesStr = '';

    if (Array.isArray(attributes)) {
        attrValuesStr = attributes
            .map(a => a && a.value ? String(a.value).trim() : '')
            .filter(Boolean)
            .join(' ');
    } else if (typeof attributes === 'object' && attributes !== null) {
        attrValuesStr = Object.values(attributes)
            .map(v => v ? String(v).trim() : '')
            .filter(Boolean)
            .join(' ');
    } else if (typeof attributes === 'string' && attributes.trim()) {
        try {
            const parsed = JSON.parse(attributes);
            return computeVariationName(parentName, parsed);
        } catch {
            attrValuesStr = attributes.trim();
        }
    }

    return [cleanParent, attrValuesStr].filter(Boolean).join(' ');
};

export const hasMissingRequiredAttributes = (variations: Variation[] = []) => variations
    .some((variation) => !hasVariationAttribute(variation));

/** Remove somente o identificador interno que versões antigas ou colisões temporárias anexavam ao SKU. */
export const normalizeVariationSku = (sku?: string): string => {
    const value = String(sku || '').trim();
    return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

export const ensureDefaultVariation = <T extends Partial<Product>>(product: T): T => {
    if (product.itemType === 'service') return product;
    if (product.variations?.length) return { ...product, hasVariations: true };
    const name = product.name || product.title || product.description || 'Produto';
    const sku = product.code ? `${product.code}-01` : '';
    return {
        ...product,
        hasVariations: true,
        variations: [{ id: product.id ? `${product.id}_${sku || '01'}` : crypto.randomUUID(), sku, name, stock: Number(product.stock || 0), unitPrice: Number(product.unitPrice || 0), costPrice: Number(product.costPrice || 0), active: product.active !== false, attributes: [], images: [...(product.images || [])], syncUnitPrice: true, syncPromoPrice: true, syncCostPrice: true, syncDescription: true, syncWidth: true, syncHeight: true, syncDepth: true, syncWeight: true }],
    };
};
