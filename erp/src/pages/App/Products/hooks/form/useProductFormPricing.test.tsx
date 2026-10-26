// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type Product from '@/pages/types/product.type';
import { useState } from 'react';
import { useProductFormPricing } from './useProductFormPricing';

afterEach(cleanup);

function renderPricing(initialData: Partial<Product>) {
  return renderHook(() => {
    const [formData, setFormData] = useState(initialData);
    const pricing = useProductFormPricing(formData, setFormData);
    return { formData, ...pricing };
  });
}

const productWithInheritedPromo: Partial<Product> = {
  unitPrice: 100,
  promoPrice: 80,
  variations: [
    {
      id: 'variation-1',
      sku: 'PROD-01',
      name: 'Produto simples',
      unitPrice: 100,
      promoPrice: 80,
      stock: 0,
      active: true,
      attributes: [],
      syncUnitPrice: true,
      syncPromoPrice: true,
    },
  ],
};

describe('useProductFormPricing', () => {
  it('remove a promoção ao informar percentual zero e propaga a limpeza herdada', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handleDiscountPercentChange('0'));

    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.discountPercent).toBe('0');
    expect(result.current.discountFixed).toBe('');
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });

  it('apaga campos auxiliares obsoletos ao igualar o promocional ao preço de venda', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handlePromoPriceFieldChange('100'));

    expect(result.current.formData.promoPrice).toBe(100);
    expect(result.current.discountPercent).toBe('');
    expect(result.current.discountFixed).toBe('');
    expect(result.current.formData.variations?.[0].promoPrice).toBe(100);
  });

  it('normaliza promoção direta zero como ausência de promoção', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handlePromoPriceFieldChange('0'));

    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.discountPercent).toBe('');
    expect(result.current.discountFixed).toBe('');
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });

  it('propaga preço e promoção do pai somente para campos herdados da família', () => {
    const { result } = renderPricing({
      unitPrice: 100,
      promoPrice: 80,
      variations: [
        {
          ...productWithInheritedPromo.variations![0],
          syncUnitPrice: true,
          syncPromoPrice: true,
        },
        {
          ...productWithInheritedPromo.variations![0],
          id: 'variation-custom',
          syncUnitPrice: false,
          syncPromoPrice: false,
          unitPrice: 65,
          promoPrice: 55,
        },
        {
          ...productWithInheritedPromo.variations![0],
          id: 'variation-mixed',
          syncUnitPrice: true,
          syncPromoPrice: false,
          unitPrice: 100,
          promoPrice: 45,
        },
      ],
    });

    act(() => result.current.handlePriceChange(120));
    act(() => result.current.handlePromoPriceFieldChange(90));

    expect(result.current.formData.variations?.map(({ unitPrice, promoPrice }) => [unitPrice, promoPrice])).toEqual([
      [120, 90],
      [65, 55],
      [120, 45],
    ]);
  });

  it('preserva o sinal de desconto fixo negativo e não aplica promoção', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handleDiscountFixedChange(-5));

    expect(result.current.discountFixed).toBe('-5');
    expect(result.current.discountPercent).toBe('');
    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });

  it('preserva preço de venda negativo para o schema impedir a submissão', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handlePriceChange(-5));

    expect(result.current.formData.unitPrice).toBe(-5);
    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.formData.variations?.[0].unitPrice).toBe(-5);
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });

  it('normaliza preço promocional negativo como ausência de promoção', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handlePromoPriceFieldChange(-5));

    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.discountPercent).toBe('');
    expect(result.current.discountFixed).toBe('');
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });

  it('não aplica promoção quando o desconto percentual ultrapassa 100%', () => {
    const { result } = renderPricing(productWithInheritedPromo);

    act(() => result.current.handleDiscountPercentChange('150'));

    expect(result.current.discountPercent).toBe('150');
    expect(result.current.discountFixed).toBe('150.00');
    expect(result.current.formData.promoPrice).toBeUndefined();
    expect(result.current.formData.variations?.[0].promoPrice).toBeUndefined();
  });
});
