import { describe, expect, it } from 'vitest';
import {
  buildNcmSearchTerms,
  validateCategoryChoice,
  validateNcmChoice,
  type CategoryCandidate,
  type NcmCandidate,
} from '../../../../../../api/products/classificationCore';

describe('Jev: validação determinística no backend', () => {
  const category: CategoryCandidate = { id: 'cat-1', name: 'Guarda-roupas', active: true, selectable: true };
  const ncm: NcmCandidate = { code: '94036000', official_description: 'Móveis de madeira', active: true, start_date: null, end_date: null };

  it('aceita somente categoria oferecida e ainda disponível', () => {
    const offered = new Map([['c0', category]]);
    const current = new Map([[category.id, category]]);
    expect(validateCategoryChoice('c0', offered, current)).toBe(category.id);
    expect(validateCategoryChoice('cat-arbitraria', offered, current)).toBeNull();
    expect(validateCategoryChoice('c0', offered, new Map())).toBeNull();
    expect(validateCategoryChoice('c0', offered, new Map([[category.id, { ...category, active: false }]]))).toBeNull();
    expect(validateCategoryChoice('c0', offered, new Map([[category.id, { ...category, selectable: false }]]))).toBeNull();
  });

  it('aceita somente NCM oferecido, ativo e vigente', () => {
    const offered = new Map([['n0', ncm]]);
    const current = new Map([[ncm.code, ncm]]);
    expect(validateNcmChoice('n0', offered, current, '2026-09-29')?.code).toBe(ncm.code);
    expect(validateNcmChoice('99999999', offered, current, '2026-09-29')).toBeNull();
    expect(validateNcmChoice('n0', offered, new Map(), '2026-09-29')).toBeNull();
    expect(validateNcmChoice('n0', offered, new Map([[ncm.code, { ...ncm, end_date: '2026-09-28' }]]), '2026-09-29')).toBeNull();
  });

  it('mantém busca de shortlist limitada e sem dados pessoais', () => {
    const terms = buildNcmSearchTerms('Guarda Roupa Sidney 6 Portas', 'Dormitório', 'MDP');
    expect(terms.length).toBeLessThanOrEqual(5);
    expect(terms).toContain('guarda roupa');
  });
});
