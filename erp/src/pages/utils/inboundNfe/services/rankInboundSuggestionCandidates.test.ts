import { expect, it } from 'vitest';
import { rankInboundSuggestionCandidates } from './rankInboundSuggestionCandidates';

it('envia Beliche Rubin no primeiro lote mesmo quando veio na posição 45 do banco', () => {
    const products = Array.from({ length: 83 }, (_, index) => ({ id: String(index), name: 'Cômoda ' + index, variations: [] }));
    products[44] = { id: 'rubin', name: 'BELICHE RUBIN ESPECIAL C/GRADE E ESCADA 1 Marfim', variations: [] };
    const ranked = rankInboundSuggestionCandidates(products, 'BELICHE RUBIN ESPECIAL C/GRADE E ESCADA 1 Marfim');
    expect(ranked[0].id).toBe('rubin');
    expect(ranked).toHaveLength(83);
    expect(products[44].id).toBe('rubin');
});

it('prioriza palavras compartilhadas sem excluir candidatos com nomes diferentes', () => {
    const ranked = rankInboundSuggestionCandidates([
        { id: 'mesa', name: 'Mesa de jantar', variations: [] },
        { id: 'rubin', name: 'Rubin Beliche Marfim', variations: [] },
        { id: 'milao', name: 'Beliche Milão', variations: [] },
    ], 'BELICHE RUBIN C/ ESCADA MARFIM');
    expect(ranked.map(product => product.id)).toEqual(['rubin', 'milao', 'mesa']);
});
