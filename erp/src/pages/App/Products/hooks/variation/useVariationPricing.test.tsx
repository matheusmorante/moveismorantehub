// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import { useVariationPricing } from './useVariationPricing';

const parentProduct: Pick<Product, 'unitPrice' | 'promoPrice'> = {
  unitPrice: 100,
  promoPrice: 80,
};

const createVariation = (overrides: Partial<Variation> = {}): Variation => ({
  id: 'variation-1',
  sku: 'SKU-1',
  name: 'Poltrona Azul',
  stock: 1,
  unitPrice: 100,
  active: true,
  attributes: [],
  syncUnitPrice: false,
  syncPromoPrice: true,
  ...overrides,
});

const renderPricingHook = (initialVariation = createVariation()) =>
  renderHook(() => {
    const [formData, setFormData] = useState<Variation | null>(initialVariation);
    const pricing = useVariationPricing({ formData, setFormData, parentProduct });
    return { ...pricing, formData };
  });

afterEach(cleanup);

describe('useVariationPricing', () => {
  it('derives the parent discount shown for inherited prices', () => {
    const { result } = renderPricingHook();

    expect(result.current.getEffectiveDiscountPercent()).toBe('20.0');
    expect(result.current.getEffectiveDiscountFixed()).toBe('20.00');
  });

  it('derives discount from the variation promo when only regular price is inherited', () => {
    const { result } = renderPricingHook(
      createVariation({
        syncUnitPrice: true,
        syncPromoPrice: false,
        unitPrice: 100,
        promoPrice: 65,
      })
    );

    expect(result.current.getEffectiveDiscountPercent()).toBe('35.0');
    expect(result.current.getEffectiveDiscountFixed()).toBe('35.00');
  });

  it('edits a variation-owned promotion without removing regular-price inheritance', () => {
    const { result } = renderPricingHook(
      createVariation({
        syncUnitPrice: true,
        syncPromoPrice: false,
        unitPrice: 100,
        promoPrice: 65,
      })
    );

    act(() => result.current.handlePromoPriceFieldChange('60'));

    expect(result.current.formData?.unitPrice).toBe(100);
    expect(result.current.formData?.promoPrice).toBe(60);
    expect(result.current.formData?.syncUnitPrice).toBe(true);
    expect(result.current.formData?.syncPromoPrice).toBe(false);
  });

  it('edits the discount of an own promotion using the inherited regular price', () => {
    const { result } = renderPricingHook(
      createVariation({
        syncUnitPrice: true,
        syncPromoPrice: false,
        unitPrice: 100,
        promoPrice: 65,
      })
    );

    act(() => result.current.handleDiscountPercentChange('40'));

    expect(result.current.formData?.promoPrice).toBe(60);
    expect(result.current.formData?.syncUnitPrice).toBe(true);
    expect(result.current.formData?.syncPromoPrice).toBe(false);
  });

  it('updates promotional price and fixed discount from a percentage', () => {
    const { result } = renderPricingHook();

    act(() => result.current.handleDiscountPercentChange('15'));

    expect(result.current.varDiscountPercent).toBe('15');
    expect(result.current.varDiscountFixed).toBe('15.00');
    expect(result.current.formData?.promoPrice).toBe(85);
    expect(result.current.formData?.syncUnitPrice).toBe(false);
    expect(result.current.formData?.syncPromoPrice).toBe(false);
  });

  it('retains an over-limit percentage for validation without creating a promotion', () => {
    const { result } = renderPricingHook();

    act(() => result.current.handleDiscountPercentChange('150'));

    expect(result.current.varDiscountPercent).toBe('150');
    expect(result.current.varDiscountFixed).toBe('150.00');
    expect(result.current.formData?.promoPrice).toBeUndefined();
  });

  it('normalizes a zero percentage to no promotion in both pricing fields', () => {
    const { result } = renderPricingHook();

    act(() => result.current.handleDiscountPercentChange('0'));

    expect(result.current.varDiscountPercent).toBe('0');
    expect(result.current.varDiscountFixed).toBe('');
    expect(result.current.formData?.promoPrice).toBeUndefined();
  });

  it('updates promotional price and percentage from a fixed discount', () => {
    const { result } = renderPricingHook(createVariation({ unitPrice: 80 }));

    act(() => result.current.handleDiscountFixedChange('20'));

    expect(result.current.varDiscountFixed).toBe('20');
    expect(result.current.varDiscountPercent).toBe('25.0');
    expect(result.current.formData?.promoPrice).toBe(60);
    expect(result.current.formData?.syncUnitPrice).toBe(false);
    expect(result.current.formData?.syncPromoPrice).toBe(false);
  });

  it('recalculates the promotional price when the base price changes', () => {
    const { result } = renderPricingHook();
    act(() => result.current.handleDiscountPercentChange('10'));

    act(() => result.current.handlePriceChange('200'));

    expect(result.current.formData?.unitPrice).toBe(200);
    expect(result.current.varDiscountFixed).toBe('20.00');
    expect(result.current.formData?.promoPrice).toBe(180);
    expect(result.current.formData?.syncUnitPrice).toBe(false);
    expect(result.current.formData?.syncPromoPrice).toBe(false);
  });

  it('clears promotional and discount values when the promotional price is blank', () => {
    const { result } = renderPricingHook();
    act(() => result.current.handleDiscountPercentChange('10'));

    act(() => result.current.handlePromoPriceFieldChange(''));

    expect(result.current.varDiscountPercent).toBe('');
    expect(result.current.varDiscountFixed).toBe('');
    expect(result.current.formData?.promoPrice).toBeUndefined();
  });
});
