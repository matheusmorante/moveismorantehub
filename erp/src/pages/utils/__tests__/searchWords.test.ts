import { describe, expect, it } from 'vitest';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  buildPostgrestAccentInsensitiveWordsPattern,
  buildAccentInsensitiveRegex,
  buildNormalizedWordsRegex,
  matchesSearchText,
} from '../../../../../shared-utils/searchText';
import { buildProductSearchTerms, buildProductVariationSearchFilter } from '../../../../../shared-utils/productListSearch';

describe('busca com palavras em qualquer ordem', () => {
  it('encontra todos os termos sem diferenciar acentos e rejeita termos ausentes', () => {
    const name = 'Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença';
    expect(matchesSearchText(name, 'balcao florença pia')).toBe(true);
    expect(matchesSearchText(name, 'pia BALCÃO florenca')).toBe(true);
    expect(matchesSearchText(name, 'balcao florença cozinha')).toBe(false);
    expect(matchesSearchText('SKU-0123', '0123')).toBe(true);
    expect(matchesSearchText(name, '   ')).toBe(true);
  });

  it('gera um padrão remoto que exige todas as palavras no mesmo campo', () => {
    const pattern = buildPostgrestAccentInsensitiveWordsPattern('balcão florença pia');
    const expression = new RegExp(pattern.slice(1, -1), 'i');
    expect(expression.test('Balcão para Pia Florença')).toBe(true);
    expect(expression.test('Balcão para Pia')).toBe(false);
  });

  it('mantém variantes de acento e caixa na expressão compacta', () => {
    const expression = new RegExp(`^${buildAccentInsensitiveRegex('cafe')}$`, 'i');
    for (const value of ['cafe', 'CAFÉ', 'càfê', 'çáfè']) expect(expression.test(value)).toBe(true);
  });

  it('preserva caracteres literais e todas as palavras em campos normalizados', () => {
    const expression = new RegExp(buildNormalizedWordsRegex('Pia (1.20) FLORENÇA'), 'i');
    expect(expression.test('balcao florenca para pia (1.20)')).toBe(true);
    expect(expression.test('balcao florenca para pia (1x20)')).toBe(false);
    expect(expression.test('balcao para pia (1.20)')).toBe(false);
  });

  it('combina cada palavra com os campos pesquisados antes do limite', () => {
    const filter = buildPostgrestAccentInsensitiveOrFilter(['name', 'code'], 'balcão florença pia');
    expect(filter.startsWith('and(or(')).toBe(true);
    expect((filter.match(/name\.imatch\./g) || [])).toHaveLength(3);
    expect((filter.match(/code\.imatch\./g) || [])).toHaveLength(3);
    const variationFilter = buildProductVariationSearchFilter(buildProductSearchTerms('balcão florença pia').searchTerms);
    expect(variationFilter.startsWith('and(or(')).toBe(true);
    expect(variationFilter).toContain('sku.imatch.');
  });
});
