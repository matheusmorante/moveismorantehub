import { describe, expect, it } from 'vitest';
import { buildProductPriceLabelUrl } from './productLabelLinks';

describe('buildProductPriceLabelUrl', () => {
  it('opens ERP price labels with the selected product ready to add', () => {
    expect(buildProductPriceLabelUrl('https://erp.example', 'product/one')).toBe(
      'https://erp.example/estoque/etiquetas?cat=precos&productId=product%2Fone&autoAddProduct=true'
    );
  });
});
