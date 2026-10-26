// @vitest-environment happy-dom
import type React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import { VariationPricingTab } from './VariationPricingTab';

const parentProduct = {
  id: 'product-1',
  name: 'Poltrona',
  description: 'Poltrona',
  unitPrice: 200,
  promoPrice: 160,
  unit: 'UN',
  active: true,
  itemType: 'product',
  hasVariations: true,
} as Product;

const createVariation = (overrides: Partial<Variation> = {}): Variation => ({
  id: 'variation-1',
  sku: 'SKU-1',
  name: 'Poltrona Azul',
  stock: 1,
  unitPrice: 120,
  promoPrice: 100,
  active: true,
  attributes: [],
  syncUnitPrice: true,
  syncPromoPrice: true,
  ...overrides,
});

const renderPricingTab = (
  variation: Variation,
  setFormData: React.Dispatch<React.SetStateAction<Variation | null>>
) =>
  render(
    <VariationPricingTab
      formData={variation}
      setFormData={setFormData}
      parentProduct={parentProduct}
      varDiscountPercent="16.7"
      varDiscountFixed="20.00"
      getEffectiveDiscountPercent={() => '20.0'}
      getEffectiveDiscountFixed={() => '40.00'}
      handlePriceChange={vi.fn()}
      handleDiscountPercentChange={vi.fn()}
      handleDiscountFixedChange={vi.fn()}
      handlePromoPriceFieldChange={vi.fn()}
    />
  );

afterEach(cleanup);

describe('VariationPricingTab', () => {
  it('desvincula preço regular e promoção juntos ao escolher preço próprio', () => {
    const setFormData = vi.fn<React.Dispatch<React.SetStateAction<Variation | null>>>();
    const variation = createVariation();
    renderPricingTab(variation, setFormData);

    fireEvent.click(screen.getByRole('button', { name: 'Preço Herdado do Pai' }));

    const update = setFormData.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    const next = (update as (previous: Variation | null) => Variation | null)(variation);
    expect(next).toMatchObject({
      syncUnitPrice: false,
      syncPromoPrice: false,
      unitPrice: 120,
      promoPrice: 100,
    });
  });

  it('reativa os dois vínculos e copia os valores do pai ao escolher preço herdado', () => {
    const setFormData = vi.fn<React.Dispatch<React.SetStateAction<Variation | null>>>();
    const variation = createVariation({
      syncUnitPrice: false,
      syncPromoPrice: false,
    });
    renderPricingTab(variation, setFormData);

    fireEvent.click(screen.getByRole('button', { name: 'Preço Personalizado' }));

    const update = setFormData.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    const next = (update as (previous: Variation | null) => Variation | null)(variation);
    expect(next).toMatchObject({
      syncUnitPrice: true,
      syncPromoPrice: true,
      unitPrice: parentProduct.unitPrice,
      promoPrice: parentProduct.promoPrice,
    });
  });

  it('mostra a promoção própria em herança parcial e preserva os valores ao entrar no modo próprio', () => {
    const setFormData = vi.fn<React.Dispatch<React.SetStateAction<Variation | null>>>();
    const variation = createVariation({
      syncUnitPrice: true,
      syncPromoPrice: false,
      unitPrice: parentProduct.unitPrice,
      promoPrice: 95,
    });
    const { container } = renderPricingTab(variation, setFormData);

    expect(screen.getByRole('button', { name: /herança parcial/i })).toBeTruthy();
    const promoInput = container.querySelector<HTMLInputElement>('#variation-promo-price-input');
    expect(promoInput?.value).toBe('95,00');
    expect(promoInput?.disabled).toBe(false);
    expect(container.querySelector<HTMLInputElement>('#variation-unit-price-input')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('#variation-discount-percent-input')?.disabled).toBe(false);
    expect(container.querySelector<HTMLInputElement>('#variation-discount-fixed-input')?.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /herança parcial/i }));

    const update = setFormData.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    const next = (update as (previous: Variation | null) => Variation | null)(variation);
    expect(next).toMatchObject({
      syncUnitPrice: false,
      syncPromoPrice: false,
      unitPrice: parentProduct.unitPrice,
      promoPrice: 95,
    });
  });

  it('mantém a promoção bloqueada quando apenas o preço regular é próprio', () => {
    const setFormData = vi.fn<React.Dispatch<React.SetStateAction<Variation | null>>>();
    const variation = createVariation({
      syncUnitPrice: false,
      syncPromoPrice: true,
      unitPrice: 120,
      promoPrice: parentProduct.promoPrice,
    });
    const { container } = renderPricingTab(variation, setFormData);

    expect(container.querySelector<HTMLInputElement>('#variation-unit-price-input')?.disabled).toBe(false);
    expect(container.querySelector<HTMLInputElement>('#variation-promo-price-input')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('#variation-discount-percent-input')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('#variation-discount-fixed-input')?.disabled).toBe(true);
  });
});
