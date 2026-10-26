import { describe, expect, it } from 'vitest';
import {
  resolveMobileProductFormHasVariations,
  resolveMobileProductHasVariations,
  initializeMobileProductCode,
  shouldShowMobileProductVariationsTab,
  shouldShowMobileProductCompositionTab,
} from './mobileProductVariationMode';

describe('initializeMobileProductCode', () => {
  const defaultVariation = { id: 'generated-01', sku: 'PRD-01', images: [] };

  it('keeps a selected variation mode while adding the generated code and default variation', () => {
    const initialized = initializeMobileProductCode(
      {
        itemType: 'product',
        hasVariations: true,
        variations: [],
        images: ['parent.jpg'],
      },
      'PRD',
      defaultVariation
    );

    expect(initialized).toEqual({
      itemType: 'product',
      hasVariations: true,
      variations: [defaultVariation],
      images: ['parent.jpg'],
      code: 'PRD',
    });
    expect(initialized.variations[0].images).toEqual([]);
  });

  it('keeps simple products simple, derives mode from multiple rows, and clears service mode', () => {
    const simple = initializeMobileProductCode(
      { itemType: 'product', hasVariations: false, variations: [] },
      'PRD',
      defaultVariation
    );
    const multiple = initializeMobileProductCode(
      { itemType: 'product', hasVariations: false, variations: [{ id: 'one' }, { id: 'two' }] },
      'PRD',
      defaultVariation
    );
    const service = initializeMobileProductCode(
      { itemType: 'service', hasVariations: true, variations: [] },
      'SRV',
      defaultVariation
    );

    expect(simple.hasVariations).toBe(false);
    expect(simple.variations).toEqual([defaultVariation]);
    expect(multiple.hasVariations).toBe(true);
    expect(service.hasVariations).toBe(false);
  });

  it('preserves an existing draft code and its pending variation rows', () => {
    const variations = [{ id: 'pending-01' }];
    const initialized = initializeMobileProductCode(
      { code: 'CUSTOM', itemType: 'product', hasVariations: true, variations },
      'PRD',
      defaultVariation
    );

    expect(initialized.code).toBe('CUSTOM');
    expect(initialized.variations).toBe(variations);
    expect(initialized.hasVariations).toBe(true);
  });
});

describe('resolveMobileProductHasVariations', () => {
  it('maps saved standard products by operational variation count', () => {
    expect(resolveMobileProductHasVariations({
      item_type: 'product',
      has_variations: true,
      product_variations: [{ id: 'only-one' }],
      allVariations: [{ id: 'only-one' }],
    } as any)).toBe(false);
    expect(resolveMobileProductHasVariations({
      itemType: 'product',
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(true);
  });

  it('preserves the stored catalog mode for compositions and drafts', () => {
    expect(resolveMobileProductHasVariations({
      itemType: 'composition',
      hasVariations: true,
      variations: [{ id: 'only-one' }],
    })).toBe(true);
    expect(resolveMobileProductHasVariations({
      itemType: 'product',
      status: 'draft',
      has_variations: true,
      variations: [{ id: 'only-one' }],
    })).toBe(true);
  });

  it('derives completed composition mode from rows while preserving draft and service mode', () => {
    expect(resolveMobileProductFormHasVariations({
      itemType: 'composition',
      hasVariations: true,
      variations: [{ id: 'only-one' }],
    })).toBe(false);
    expect(resolveMobileProductFormHasVariations({
      itemType: 'composition',
      hasVariations: false,
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(true);
    expect(resolveMobileProductFormHasVariations({
      itemType: 'product',
      status: 'draft',
      has_variations: true,
      variations: [{ id: 'only-one' }],
    })).toBe(true);
    expect(resolveMobileProductFormHasVariations({
      itemType: 'service',
      hasVariations: true,
      variations: [],
    })).toBe(true);
  });

  it('derives completed standard product mode from the operational variation count', () => {
    expect(resolveMobileProductFormHasVariations({
      itemType: 'product',
      hasVariations: true,
      variations: [{ id: 'only-one' }],
    })).toBe(false);
    expect(resolveMobileProductFormHasVariations({
      itemType: 'product',
      hasVariations: false,
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(true);
  });

  it('shows variation editing only when ERP multi-variation mode is active', () => {
    expect(shouldShowMobileProductVariationsTab({
      itemType: 'product',
      hasVariations: false,
      variations: [{ id: 'only-one' }],
    })).toBe(false);
    expect(shouldShowMobileProductVariationsTab({
      itemType: 'composition',
      hasVariations: false,
      variations: [{ id: 'only-one' }],
    })).toBe(false);
    expect(shouldShowMobileProductVariationsTab({
      itemType: 'composition',
      hasVariations: true,
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(true);
    expect(shouldShowMobileProductVariationsTab({
      itemType: 'service',
      hasVariations: true,
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(false);
  });

  it('shows the composition editor only for simple compositions, not composition families', () => {
    expect(shouldShowMobileProductCompositionTab({
      itemType: 'composition',
      hasVariations: false,
      variations: [{ id: 'primary' }],
    })).toBe(true);
    expect(shouldShowMobileProductCompositionTab({
      item_type: 'composition',
      has_variations: true,
      variations: [{ id: 'one' }, { id: 'two' }],
    })).toBe(false);
    expect(shouldShowMobileProductCompositionTab({
      itemType: 'product',
      hasVariations: false,
      variations: [{ id: 'primary' }],
    })).toBe(false);
    expect(shouldShowMobileProductCompositionTab({
      itemType: 'service',
      variations: [],
    })).toBe(false);
  });
});
