/**
 * Resolve o nome de exibição de uma variação a partir dos atributos ou propriedades fallback
 */
export function getVariationDisplayName(variation: any, fallbackName?: string): string {
    if (!variation) return fallbackName || '';

    let variationName = '';
    const attrs = variation.attributes;
    if (attrs && Array.isArray(attrs)) {
        variationName = attrs.map((attr: any) => attr.value).filter(Boolean).join(' ');
    } else if (attrs && typeof attrs === 'object') {
        variationName = Object.values(attrs).filter(Boolean).join(' ');
    }

    if (!variationName) {
        variationName = variation.displayName || variation.name || fallbackName || '';
    }

    return variationName;
}
