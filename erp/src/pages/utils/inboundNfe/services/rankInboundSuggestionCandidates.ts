import type { SupplierProductSummary } from './inboundSupplierProductContext';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();

/** Ordena o contexto por relevância textual; somente a IA decide o vínculo. */
export function rankInboundSuggestionCandidates(products: SupplierProductSummary[], description: string): SupplierProductSummary[] {
    const query = normalize(description);
    const tokens = new Set(query.split(' ').filter(token => token.length >= 3));
    const score = (name: string) => {
        const normalized = normalize(name);
        if (normalized === query && query) return 1000;
        return [...new Set(normalized.split(' '))].filter(token => tokens.has(token)).length;
    };
    return products.map((product, index) => ({ product, index, score: Math.max(score(product.name), ...product.variations.map(variation => score(variation.name))) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(entry => entry.product);
}
