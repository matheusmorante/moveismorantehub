import { describe, expect, it } from 'vitest';
import {
  buildNcmSearchTerms,
  validateCategoryChoice,
  validateNcmChoice,
  type CategoryCandidate,
  type NcmCandidate,
} from '../../../../../../../api/products/classificationCore';
import {
  isWoodenBedroomFurnitureByName,
  WOODEN_BEDROOM_FURNITURE_NCM,
} from '../../../../../../../shared-utils/ncmClassification';

describe('Jev: validação determinística no backend', () => {
  const category: CategoryCandidate = {
    id: 'cat-1',
    name: 'Guarda-roupas',
    active: true,
    selectable: true,
  };
  const ncm: NcmCandidate = {
    code: '94036000',
    official_description: 'Móveis de madeira',
    active: true,
    is_active: true,
    start_date: null,
    end_date: null,
  };

  it('aceita somente categoria oferecida e ainda disponível', () => {
    const offered = new Map([['c0', category]]);
    const current = new Map([[category.id, category]]);
    expect(validateCategoryChoice('c0', offered, current)).toBe(category.id);
    expect(validateCategoryChoice('cat-arbitraria', offered, current)).toBeNull();
    expect(validateCategoryChoice('c0', offered, new Map())).toBeNull();
    expect(
      validateCategoryChoice(
        'c0',
        offered,
        new Map([[category.id, { ...category, active: false }]])
      )
    ).toBeNull();
    expect(
      validateCategoryChoice(
        'c0',
        offered,
        new Map([[category.id, { ...category, selectable: false }]])
      )
    ).toBeNull();
  });

  it('aceita somente NCM oferecido, ativo e vigente', () => {
    const offered = new Map([['n0', ncm]]);
    const current = new Map([[ncm.code, ncm]]);
    expect(validateNcmChoice('n0', offered, current, '2026-09-29')?.code).toBe(ncm.code);
    expect(validateNcmChoice('99999999', offered, current, '2026-09-29')).toBeNull();
    expect(validateNcmChoice('n0', offered, new Map(), '2026-09-29')).toBeNull();
    expect(
      validateNcmChoice(
        'n0',
        offered,
        new Map([[ncm.code, { ...ncm, end_date: '2026-09-28' }]]),
        '2026-09-29'
      )
    ).toBeNull();
    expect(
      validateNcmChoice(
        'n0',
        offered,
        new Map([[ncm.code, { ...ncm, is_active: false }]]),
        '2026-09-29'
      )
    ).toBeNull();
  });

  it('mantém busca de shortlist limitada e sem dados pessoais', () => {
    const terms = buildNcmSearchTerms('Guarda Roupa Sidney 6 Portas', 'Dormitório', 'MDP');
    expect(terms.length).toBeLessThanOrEqual(8);
    expect(terms).toContain('guarda roupa');
  });

  it('normaliza erro comum de digitação e preserva categoria/material em títulos longos', () => {
    const typoTerms = buildNcmSearchTerms('Geroupa Sidney 6 Portas 2 Gavetas', '', 'MDP');
    const detailedTerms = buildNcmSearchTerms(
      'Produto Linha Modelo Com Muitas Especificações e Palavras Adicionais',
      'Dormitório',
      'Madeira Maciça'
    );
    expect(typoTerms).toContain('guarda roupa');
    expect(detailedTerms).toContain('madeira macica');
    expect(detailedTerms).toContain('dormitorio');
  });

  it('usa a regra de móvel de dormitório só sem material explicitamente não madeireiro', () => {
    expect(WOODEN_BEDROOM_FURNITURE_NCM).toBe('94035000');
    expect(isWoodenBedroomFurnitureByName('Geroupa Sidney')).toBe(true);
    expect(isWoodenBedroomFurnitureByName('Guarda-Roupa Sidney', 'MDP')).toBe(true);
    expect(isWoodenBedroomFurnitureByName('Guarda-Roupa de aço')).toBe(false);
    expect(isWoodenBedroomFurnitureByName('Guarda-Roupa Sidney', 'Metal')).toBe(false);
  });
});
