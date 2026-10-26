import { describe, expect, it } from 'vitest';
import { generateVariationSku, normalizeVariationSku } from './productSku';

describe('mobile generateVariationSku', () => {
  it('preenche -01 quando -01 foi removido e existem -02 e -03', () => {
    const variations = [{ sku: '654321-02' }, { sku: '654321-03' }];
    const nextSku = generateVariationSku('654321', variations);
    expect(nextSku).toBe('654321-01');
  });

  it('preenche -02 quando existem -01 e -03', () => {
    const variations = [{ sku: '654321-01' }, { sku: '654321-03' }];
    const nextSku = generateVariationSku('654321', variations);
    expect(nextSku).toBe('654321-02');
  });

  it('avança normalmente quando a sequência é contínua (-01, -02 → -03)', () => {
    const variations = [{ sku: '654321-01' }, { sku: '654321-02' }];
    const nextSku = generateVariationSku('654321', variations);
    expect(nextSku).toBe('654321-03');
  });

  it('retorna -01 para lista vazia de variações', () => {
    const nextSku = generateVariationSku('999888', []);
    expect(nextSku).toBe('999888-01');
  });

  it('preenche lacunas em ordem ao gerar com offset', () => {
    const variations = [{ sku: '654321-01' }, { sku: '654321-03' }];
    expect(generateVariationSku('654321', variations, 0)).toBe('654321-02');
    expect(generateVariationSku('654321', variations, 1)).toBe('654321-04');
    expect(generateVariationSku('654321', variations, 2)).toBe('654321-05');
  });

  it('suporta passagem direta de índice numérico', () => {
    expect(generateVariationSku('654321', 0)).toBe('654321-01');
    expect(generateVariationSku('654321', 1)).toBe('654321-02');
  });

  it('normaliza SKU de variação corretamente', () => {
    expect(normalizeVariationSku('  000312-01  ')).toBe('000312-01');
    expect(normalizeVariationSku('  AbC-01-a1b2c3  ')).toBe('AbC-01');
    expect(normalizeVariationSku('custom-red')).toBe('custom-red');
    expect(normalizeVariationSku(null)).toBe('');
    expect(normalizeVariationSku(undefined)).toBe('');
  });
});
