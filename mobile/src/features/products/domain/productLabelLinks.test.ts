import { describe, expect, it } from 'vitest';
import {
  buildProductIdentificationLabelUrl,
  buildProductPriceLabelUrl,
} from './productLabelLinks';

describe('buildProductPriceLabelUrl', () => {
  it('opens ERP price labels with the selected product ready to add', () => {
    expect(buildProductPriceLabelUrl('https://erp.example', 'product/one')).toBe(
      'https://erp.example/estoque/etiquetas?cat=precos&productId=product%2Fone&autoAddProduct=true'
    );
  });
});

describe('buildProductIdentificationLabelUrl', () => {
  it('opens identification labels with the selected variation and full-sheet preselection', () => {
    expect(
      buildProductIdentificationLabelUrl('https://erp.example', 'parent/one', 'variation one')
    ).toBe(
      'https://erp.example/estoque/etiquetas?cat=identificacao&productId=parent%2Fone&variationId=variation+one&fillSheet=1&autoAddProduct=true'
    );
  });

  it('keeps the parent product when no operational variation id is supplied', () => {
    expect(buildProductIdentificationLabelUrl('https://erp.example', 'product-id')).toBe(
      'https://erp.example/estoque/etiquetas?cat=identificacao&productId=product-id&fillSheet=1&autoAddProduct=true'
    );
  });
});
