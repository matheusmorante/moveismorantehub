export interface VariationAttributeLike {
    readonly name?: string;
    readonly value?: string;
}

export interface VariationLike {
    readonly id?: string;
    readonly name?: string;
    readonly displayName?: string;
    readonly attributes?: readonly VariationAttributeLike[] | Record<string, string> | null;
}

/**
 * Resolve o nome de exibição de uma variação a partir dos atributos ou propriedades fallback.
 * 
 * @param variation Objeto da variação contendo atributos ou nome
 * @param fallbackName Nome padrão caso nenhum atributo seja encontrado
 * @returns String formatada com o nome de exibição
 */
export function getVariationDisplayName(variation?: VariationLike | null, fallbackName?: string): string {
    if (!variation) return fallbackName || '';

    let variationName = '';
    const attrs = variation.attributes;
    if (attrs && Array.isArray(attrs)) {
        variationName = attrs
            .map((attr) => (typeof attr === 'object' && attr ? attr.value : String(attr)))
            .filter(Boolean)
            .join(' ');
    } else if (attrs && typeof attrs === 'object') {
        variationName = Object.values(attrs).filter(Boolean).join(' ');
    }

    if (!variationName) {
        variationName = variation.displayName || variation.name || fallbackName || '';
    }

    return variationName;
}
