import { describe, expect, it } from 'vitest';
import { buildProductIdentificationLabelUrl } from './productLabelLinks';

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
