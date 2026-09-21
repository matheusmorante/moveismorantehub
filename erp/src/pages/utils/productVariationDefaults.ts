import Product, { Variation } from '../types/product.type';
import { toTitleCase } from './textUtils';

export interface IncompleteAttributeInfo {
    index: number;
    name: string;
    missingReason: 'missing_name' | 'missing_value' | 'empty_attribute';
}

/**
 * Retorna lista de atributos que estão incompletos em uma variação (sem nome ou sem valor).
 */
export const getIncompleteVariationAttributes = (variation?: Variation | any): IncompleteAttributeInfo[] => {
    if (!variation) return [];

    let rawAttributes = variation.attributes;
    if (typeof rawAttributes === 'string' && rawAttributes.trim()) {
        try {
            rawAttributes = JSON.parse(rawAttributes);
        } catch {
            return [];
        }
    }

    if (Array.isArray(rawAttributes)) {
        const result: IncompleteAttributeInfo[] = [];
        rawAttributes.forEach((attr: any, index: number) => {
            if (!attr) {
                result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'empty_attribute' });
                return;
            }
            const name = String(attr.name || attr.attribute || attr.key || '').trim();
            const val = String(attr.value || attr.val || '').trim();

            if (!name) {
                result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'missing_name' });
            } else if (!val) {
                result.push({ index, name, missingReason: 'missing_value' });
            }
        });
        return result;
    }

    if (typeof rawAttributes === 'object' && rawAttributes !== null) {
        const result: IncompleteAttributeInfo[] = [];
        Object.entries(rawAttributes).forEach(([k, v], index) => {
            const name = String(k || '').trim();
            const val = String(v || '').trim();
            if (!name) {
                result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'missing_name' });
            } else if (!val) {
                result.push({ index, name, missingReason: 'missing_value' });
            }
        });
        return result;
    }

    return [];
};

/**
 * Valida se uma variação possui ao menos um atributo E que TODOS os atributos adicionados
 * possuam tanto nome quanto valor devidamente preenchidos.
 */
export const hasVariationAttribute = (variation?: Variation | any): boolean => {
    if (!variation) return false;

    let rawAttributes = variation.attributes;
    if (typeof rawAttributes === 'string' && rawAttributes.trim()) {
        try {
            rawAttributes = JSON.parse(rawAttributes);
        } catch {
            return false;
        }
    }

    // 1. Array de atributos: [{ name: 'Cor', value: 'Azul' }, ...]
    if (Array.isArray(rawAttributes)) {
        if (rawAttributes.length === 0) return false;

        // Todo atributo deve ter nome e valor não-vazios
        return rawAttributes.every((attr: any) => {
            if (!attr) return false;
            const name = String(attr.name || attr.attribute || attr.key || '').trim();
            const val = String(attr.value || attr.val || '').trim();
            return name.length > 0 && val.length > 0;
        });
    }

    // 2. Formato objeto dicionário: { "Cor": "Azul", "Tamanho": "M" }
    if (typeof rawAttributes === 'object' && rawAttributes !== null) {
        const entries = Object.entries(rawAttributes);
        if (entries.length === 0) return false;

        return entries.every(([k, v]) => {
            const name = String(k || '').trim();
            const val = String(v || '').trim();
            return name.length > 0 && val.length > 0;
        });
    }

    return false;
};

type AttributePair = { name: string; value: string; showName: boolean };

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
            .map((attr: any) => ({
                name: attr?.name || attr?.attribute || attr?.key,
                value: attr?.value || attr?.val,
                showName: attr?.showName !== false
            }))
            .filter(({ name, value }) => normalizeAttributePart(name) && normalizeAttributePart(value));
    }

    if (attributes && typeof attributes === 'object') {
        return Object.entries(attributes)
            .map(([name, rawValue]) => {
                const structuredValue = rawValue && typeof rawValue === 'object'
                    ? rawValue as { value?: unknown; val?: unknown; showName?: boolean }
                    : null;
                return {
                    name,
                    value: String(structuredValue?.value ?? structuredValue?.val ?? rawValue ?? ''),
                    showName: structuredValue?.showName !== false
                };
            })
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
    .filter(({ showName }) => showName)
    .map(({ value }) => String(value).trim());

const getLegacyUnstructuredAttributeText = (attributes: unknown): string => {
    if (typeof attributes !== 'string' || !attributes.trim()) return '';
    try {
        JSON.parse(attributes);
        return '';
    } catch {
        return toTitleCase(attributes.trim());
    }
};

export const computeVariationName = (parentName: string, attributes: Array<{ name?: string; value?: string; showName?: boolean }> | Record<string, any> | string): string => {
    const cleanParent = parentName ? toTitleCase(parentName.trim()) : '';
    const orderedValues = getVariationAttributeValuesInNameOrder(attributes).map(v => toTitleCase(v));
    const attrValuesStr = orderedValues.length > 0
        ? orderedValues.join(' ')
        : getLegacyUnstructuredAttributeText(attributes);

    const fullName = [cleanParent, attrValuesStr].filter(Boolean).join(' ');
    return toTitleCase(fullName);
};

/**
 * Nome usado ao selecionar um item em qualquer formulário do ERP.
 * A variação já contém o nome do produto pai e seus atributos, então não deve
 * receber o nome do pai novamente.
 */
export const getSelectedProductDisplayName = (product?: Partial<Product> | any, variation?: Partial<Variation> | any): string => {
    const variationName = String(variation?.name || '').trim();
    if (variationName) return toTitleCase(variationName);

    return toTitleCase(String(product?.name || product?.title || product?.description || '').trim());
};

export const hasMissingRequiredAttributes = (variations: Variation[] = []) => {
    if (!variations || variations.length === 0) return true;
    return variations.some((variation) => !hasVariationAttribute(variation));
};

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
    const name = toTitleCase(product.name || product.title || product.description || 'Produto');
    const sku = product.code ? `${product.code}-01` : '';
    return {
        ...product,
        hasVariations: true,
        // A variação principal é um novo registro físico e recebe seu próprio
        // UUID. Nunca derivar identidade de `product.id` ou do SKU.
        variations: [{ id: crypto.randomUUID(), sku, name, stock: Number(product.stock || 0), unitPrice: Number(product.unitPrice || 0), costPrice: Number(product.costPrice || 0), active: product.active !== false, status: product.status || 'hidden', attributes: [], images: [], syncUnitPrice: true, syncPromoPrice: true, syncCostPrice: true, syncDescription: true, syncWidth: true, syncHeight: true, syncDepth: true, syncWeight: true }],
    };
};
