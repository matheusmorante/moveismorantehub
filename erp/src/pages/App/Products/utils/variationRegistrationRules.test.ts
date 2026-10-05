import { describe, expect, it } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import { getVariationRegistrationIssue, resolveVariationDimensions } from './variationRegistrationRules';

const variation: Variation = {
  id: 'v1', sku: '001-01', name: 'Armário Azul', unitPrice: 120, stock: 0,
  active: false, status: 'draft', attributes: [], syncUnitPrice: false,
  syncWidth: false, syncHeight: false, syncDepth: false, width: 80, height: 180, depth: 50,
  technicalValues: { Cor: 'Azul', 'Material da estrutura': 'Madeira' },
};
const parent: Partial<Product> = {
  name: 'Armário', unitPrice: 150, categoryIds: ['categoria'], mainSupplierId: 'fornecedor',
  productKind: 'normal', width: 90, height: 190, depth: 60, variations: [variation],
};

describe('requisitos existentes para concluir uma variação', () => {
  it('permite concluir uma variação completa e usa os mesmos valores na persistência', () => {
    expect(getVariationRegistrationIssue(parent, variation)).toBeNull();
    expect(resolveVariationDimensions(parent, variation)).toEqual({ width: 80, height: 180, depth: 50 });
  });
  it.each(['width', 'height', 'depth'] as const)('bloqueia %s inválida', (field) => {
    expect(getVariationRegistrationIssue(parent, { ...variation, [field]: NaN })).toMatchObject({ tab: 'tecnico' });
  });
  it('resolve dimensões herdadas e características técnicas com vírgula decimal', () => {
    const inherited = { ...variation, syncWidth: true, syncHeight: true, syncDepth: true };
    expect(resolveVariationDimensions(parent, inherited)).toEqual({ width: 90, height: 190, depth: 60 });
    const technical = { ...variation, width: 0, height: 0, depth: 0,
      technicalValues: { ...variation.technicalValues, Largura: '80,5', Altura: '180', Comprimento: '50' } };
    expect(getVariationRegistrationIssue(parent, technical)).toBeNull();
    expect(resolveVariationDimensions(parent, technical).width).toBe(80.5);
  });
  it.each(['Cor', 'Material da estrutura'])('bloqueia característica obrigatória %s vazia', (name) => {
    expect(getVariationRegistrationIssue(parent, { ...variation,
      technicalValues: { ...variation.technicalValues, [name]: '' } })?.message).toContain(name);
  });
  it('valida preço próprio e permite preço herdado somente quando a sincronização está ligada', () => {
    expect(getVariationRegistrationIssue(parent, { ...variation, unitPrice: 0 })?.message).toContain('Preço de Venda');
    expect(getVariationRegistrationIssue(parent, { ...variation, unitPrice: 0, syncUnitPrice: true })).toBeNull();
  });
  it('valida nome, categoria, fornecedor e promoção pelos requisitos comuns', () => {
    expect(getVariationRegistrationIssue(parent, { ...variation, name: 'A' })?.message).toContain('Nome');
    expect(getVariationRegistrationIssue({ ...parent, categoryIds: [] }, variation)?.message).toContain('categoria');
    expect(getVariationRegistrationIssue({ ...parent, mainSupplierId: undefined }, variation)?.message).toContain('fornecedor');
    expect(getVariationRegistrationIssue(parent, { ...variation, promoPrice: 120, syncPromoPrice: false })?.message).toContain('promocional');
  });
  it('bloqueia combinação ou SKU repetido de outra variação', () => {
    const sibling = { ...variation, id: 'v2', sku: '001-02' };
    const attributes = [{ name: 'Cor', value: 'Azul' }];
    expect(getVariationRegistrationIssue({ ...parent, variations: [{ ...sibling, attributes }] },
      { ...variation, attributes })?.message).toContain('combinação');
    expect(getVariationRegistrationIssue({ ...parent, variations: [{ ...sibling, sku: variation.sku }] }, variation)?.message).toContain('SKU');
  });
  it('permite cadastro de origem não convencional mantendo a ativação sob sua regra própria', () => {
    expect(getVariationRegistrationIssue({ ...parent, productKind: 'salvado' }, variation)).toBeNull();
  });
});
