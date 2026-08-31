import Product, { Variation } from '../types/product.type';

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

type AttributePair = { name: string; value: string };

const normalizeAttributePart = (value: unknown) => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();

export const getVariationAttributePairs = (variation?: Variation | any): AttributePair[] => {
    if (!variation) return [];

    let attributes = variation.attributes;
    if (typeof attributes === 'string') {
        try {
            attributes = JSON.parse(attributes);
        } catch {
            return [];
        }
    }

    if (Array.isArray(attributes)) {
        return attributes
            .map((attr: any) => ({ name: attr?.name || attr?.attribute || attr?.key, value: attr?.value || attr?.val }))
            .filter(({ name, value }) => normalizeAttributePart(name) && normalizeAttributePart(value));
    }

    if (attributes && typeof attributes === 'object') {
        return Object.entries(attributes)
            .map(([name, value]) => ({ name, value: String(value || '') }))
            .filter(({ name, value }) => normalizeAttributePart(name) && normalizeAttributePart(value));
    }

    return [];
};

const getAttributeCombinationKey = (variation?: Variation | any) => getVariationAttributePairs(variation)
    .map(({ name, value }) => `${normalizeAttributePart(name)}=${normalizeAttributePart(value)}`)
    .sort()
    .join('|');

export const hasDuplicateVariationAttributeCombination = (variation: Variation | any, variations: Variation[] = []): boolean => {
    const combination = getAttributeCombinationKey(variation);
    if (!combination) return false;

    return variations.some((otherVariation) => {
        if (String(otherVariation.id || '') === String(variation.id || '')) return false;
        return getAttributeCombinationKey(otherVariation) === combination;
    });
};

export const getVariationAttributeValuesInNameOrder = (attributes: Variation['attributes'] | Record<string, any> | string = []) => getVariationAttributePairs({ attributes })
    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' }))
    .map(({ value }) => String(value).trim());

export const computeVariationName = (parentName: string, attributes: Array<{ name?: string; value?: string }> | Record<string, any> | string): string => {
    const cleanParent = parentName ? parentName.trim() : '';
    const orderedValues = getVariationAttributeValuesInNameOrder(attributes);
    const attrValuesStr = orderedValues.length > 0
        ? orderedValues.join(' ')
        : typeof attributes === 'string' ? attributes.trim() : '';

    return [cleanParent, attrValuesStr].filter(Boolean).join(' ');
};

export const hasMissingRequiredAttributes = (variations: Variation[] = []) => variations
    .some((variation) => !hasVariationAttribute(variation));

/** Remove somente o identificador interno que versões antigas ou colisões temporárias anexavam ao SKU. */
export const normalizeVariationSku = (sku?: string): string => {
    const value = String(sku || '').trim();
    return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

export const isDefaultVariation = (variation: any, index?: number): boolean => {
    if (index !== undefined && index !== 0) return false;
    const hasAttrs = hasVariationAttribute(variation);
    return !hasAttrs;
};

export const ensureDefaultVariation = <T extends Partial<Product>>(product: T): T => {
    if (product.itemType === 'service') return product;
    if (product.variations?.length) return { ...product, hasVariations: true };
    const name = product.name || product.title || product.description || 'Produto';
    const sku = product.code ? `${product.code}-01` : '';
    return {
        ...product,
        hasVariations: true,
        variations: [{ id: product.id ? `${product.id}_${sku || '01'}` : crypto.randomUUID(), sku, name, stock: Number(product.stock || 0), unitPrice: Number(product.unitPrice || 0), costPrice: Number(product.costPrice || 0), active: product.active !== false, attributes: [], images: [], syncUnitPrice: true, syncPromoPrice: true, syncCostPrice: true, syncDescription: true, syncWidth: true, syncHeight: true, syncDepth: true, syncWeight: true }],
    };
};
