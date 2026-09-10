import { describe, expect, it } from 'vitest';
import { resolvePostBenefits, SYSTEM_OFFICIAL_BENEFITS } from './postBenefitsResolver';

describe('postBenefitsResolver', () => {
  it('preserva exatamente quantidade, ordem, IDs e textos vindos do ERP', () => {
    const benefits = resolvePostBenefits({
      product: {
        benefits: [
          { id: 'b-4', title: 'Quarto benefício literal', subtitle: 'Sem reescrever' },
          { id: 'b-1', title: 'Primeiro depois', subtitle: 'Ordem do ERP' },
          'Texto integral com pontuação: sim!',
          { key: 'b-x', text: 'Último benefício', detail: 'Detalhe exato' },
        ],
      },
    });

    expect(benefits).toHaveLength(4);
    expect(benefits.map(item => item.id)).toEqual(['b-4', 'b-1', 'ERP.product.benefits-3', 'b-x']);
    expect(benefits.map(item => [item.title, item.subtitle])).toEqual([
      ['Quarto benefício literal', 'Sem reescrever'],
      ['Primeiro depois', 'Ordem do ERP'],
      ['Texto integral com pontuação: sim!', undefined],
      ['Último benefício', 'Detalhe exato'],
    ]);
  });

  it('considera lista vazia autoritativa e não preenche com fallback', () => {
    expect(resolvePostBenefits({ product: { benefits: [] } })).toEqual([]);
  });

  it('usa somente o fallback oficial explícito para registros antigos sem fonte estruturada', () => {
    expect(resolvePostBenefits({ product: {} })).toEqual(SYSTEM_OFFICIAL_BENEFITS);
  });
});
