import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

import {
  calculateNextVariationSku,
  generateVariationSku,
} from '../productService/productSkuService';

describe('calculateNextVariationSku', () => {
  it('reutiliza o menor sufixo disponível quando há buracos na sequência (-01, -02, -04 → -03)', () => {
    const existingSkus = ['654321-01', '654321-02', '654321-04'];
    const nextSku = calculateNextVariationSku('654321', existingSkus);
    expect(nextSku).toBe('654321-03');
  });

  it('reutiliza o -01 quando apenas sufixos maiores estão cadastrados (-02, -03 → -01)', () => {
    const existingSkus = ['654321-02', '654321-03'];
    const nextSku = calculateNextVariationSku('654321', existingSkus);
    expect(nextSku).toBe('654321-01');
  });

  it('retorna -01 para pai sem nenhuma variação anterior', () => {
    const nextSku = calculateNextVariationSku('999888', []);
    expect(nextSku).toBe('999888-01');
  });

  it('ignora SKUs de outros produtos ou sem formato numérico e preenche a menor vaga', () => {
    const existingSkus = ['654321-01', '654321-03', 'OUTRO-99', 'INVALIDO'];
    const nextSku = calculateNextVariationSku('654321', existingSkus);
    expect(nextSku).toBe('654321-02');
  });

  it('suporta sufixos de dois dígitos com zero à esquerda e preenche menores antes de 10', () => {
    const existingSkus = ['100000-09'];
    const nextSku = calculateNextVariationSku('100000', existingSkus);
    expect(nextSku).toBe('100000-01');
  });

  it('avança para o próximo sequencial quando toda a faixa inicial está preenchida (-01, -02 → -03)', () => {
    const existingSkus = ['100000-01', '100000-02'];
    const nextSku = calculateNextVariationSku('100000', existingSkus);
    expect(nextSku).toBe('100000-03');
  });
});

describe('generateVariationSku', () => {
  it('preenche -01 quando -01 foi removido e existem -02 e -03', () => {
    const variations = [{ sku: '123456-02' }, { sku: '123456-03' }];
    const nextSku = generateVariationSku('123456', variations);
    expect(nextSku).toBe('123456-01');
  });

  it('preenche -02 quando existem -01 e -03', () => {
    const variations = [{ sku: '123456-01' }, { sku: '123456-03' }];
    const nextSku = generateVariationSku('123456', variations);
    expect(nextSku).toBe('123456-02');
  });

  it('avança normalmente quando a sequência é contínua (-01, -02 → -03)', () => {
    const variations = [{ sku: '123456-01' }, { sku: '123456-02' }];
    const nextSku = generateVariationSku('123456', variations);
    expect(nextSku).toBe('123456-03');
  });

  it('retorna -01 para array vazio de variações', () => {
    const nextSku = generateVariationSku('123456', []);
    expect(nextSku).toBe('123456-01');
  });

  it('preenche lacunas em ordem ao gerar em lote com offset', () => {
    const variations = [{ sku: '123456-01' }, { sku: '123456-03' }];
    const firstSku = generateVariationSku('123456', variations, 0);
    const secondSku = generateVariationSku('123456', variations, 1);
    const thirdSku = generateVariationSku('123456', variations, 2);

    expect(firstSku).toBe('123456-02');
    expect(secondSku).toBe('123456-04');
    expect(thirdSku).toBe('123456-05');
  });

  it('mantém suporte a index numérico direto', () => {
    expect(generateVariationSku('123456', 0)).toBe('123456-01');
    expect(generateVariationSku('123456', 1)).toBe('123456-02');
  });
});
