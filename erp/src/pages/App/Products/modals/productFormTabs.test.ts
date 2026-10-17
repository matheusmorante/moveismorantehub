import { describe, expect, it } from 'vitest';
import { getProductFormTabs } from './productFormTabs';
import { getVariationFormTabs } from '../components/variationModal/variationModalTabs';

describe('productFormTabs e variationModalTabs para Estoquista vs Geral', () => {
  it('oculta a aba Características (technical) para estoquista no formulário principal de produto', () => {
    const stockistTabs = getProductFormTabs(false, false, true);
    const regularTabs = getProductFormTabs(false, false, false);

    expect(stockistTabs.some((t) => t.id === 'technical')).toBe(false);
    expect(stockistTabs.some((t) => t.id === 'ecommerce')).toBe(false);
    expect(stockistTabs.some((t) => t.id === 'geral')).toBe(true);
    expect(stockistTabs.some((t) => t.id === 'estoque')).toBe(true);
    expect(stockistTabs.some((t) => t.id === 'variacoes')).toBe(true);

    expect(regularTabs.some((t) => t.id === 'technical')).toBe(true);
    expect(regularTabs.some((t) => t.id === 'ecommerce')).toBe(true);
  });

  it('oculta a aba Características (tecnico) para estoquista no modal de variação', () => {
    const stockistTabs = getVariationFormTabs(false, true);
    const regularTabs = getVariationFormTabs(false, false);

    expect(stockistTabs.some((t) => t.id === 'tecnico')).toBe(false);
    expect(stockistTabs.some((t) => t.id === 'fotos')).toBe(false);
    expect(stockistTabs.some((t) => t.id === 'descricao')).toBe(false);
    expect(stockistTabs.some((t) => t.id === 'identificacao')).toBe(true);
    expect(stockistTabs.some((t) => t.id === 'estoque')).toBe(true);

    expect(regularTabs.some((t) => t.id === 'tecnico')).toBe(true);
    expect(regularTabs.some((t) => t.id === 'fotos')).toBe(true);
    expect(regularTabs.some((t) => t.id === 'descricao')).toBe(true);
  });
});
