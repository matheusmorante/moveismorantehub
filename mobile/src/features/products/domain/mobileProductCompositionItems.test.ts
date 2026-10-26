import { describe, expect, it } from 'vitest';
import {
  getMobileProductFormCompositionItems,
  getMobileProductRootCompositionItems,
  synchronizeMobileProductFormCompositionItems,
} from './mobileProductCompositionItems';

describe('getMobileProductRootCompositionItems', () => {
  it('keeps root ingredients independent from variation ingredients', () => {
    const variationItems = [{ productId: 'component-1', quantity: 2 }];

    expect(getMobileProductRootCompositionItems({
      combo_items: [],
      comboItems: [],
      variations: [{ combo_items: variationItems }],
    } as any)).toEqual([]);
  });

  it('parses root ingredients stored as JSON while preserving the ERP field', () => {
    const rootItems = [{ productId: 'component-2', variationId: null, quantity: 1 }];

    expect(getMobileProductRootCompositionItems({ combo_items: JSON.stringify(rootItems) })).toEqual(rootItems);
  });

  it('prefers restored draft ingredients over an empty database alias', () => {
    const restoredRootItems = [{ productId: 'component-3', quantity: 1 }];

    expect(getMobileProductRootCompositionItems({
      combo_items: [],
      comboItems: restoredRootItems,
    })).toEqual(restoredRootItems);
  });

  it('loads simple-composition parts from the primary variation and falls back to the product', () => {
    const primaryItems = [{ productId: 'primary-part', quantity: 2 }];
    const rootItems = [{ productId: 'root-part', quantity: 1 }];

    expect(getMobileProductFormCompositionItems({
      comboItems: rootItems,
      variations: [{ combo_items: primaryItems }],
    }, true)).toEqual(primaryItems);
    expect(getMobileProductFormCompositionItems({
      comboItems: rootItems,
      variations: [{ combo_items: [] }],
    }, true)).toEqual(rootItems);
    expect(getMobileProductFormCompositionItems({
      comboItems: rootItems,
      variations: [{ combo_items: primaryItems }],
    }, false)).toEqual(rootItems);
  });

  it('keeps simple-composition edits synchronized without changing other variation fields', () => {
    const items = [{ productId: 'new-part', quantity: 3 }];
    const product = {
      id: 'composition',
      comboItems: [{ productId: 'old-part', quantity: 1 }],
      variations: [{ id: 'primary', sku: 'KIT-1', comboItems: [] }],
    };

    expect(synchronizeMobileProductFormCompositionItems(product, items)).toEqual({
      ...product,
      comboItems: items,
      variations: [{ ...product.variations[0], comboItems: items }],
    });
  });

  it('does not mirror the product editor value into a composition family', () => {
    const items = [{ productId: 'root-part', quantity: 1 }];
    const product = {
      comboItems: [],
      variations: [{ id: 'one', comboItems: [] }, { id: 'two', comboItems: [] }],
    };

    expect(synchronizeMobileProductFormCompositionItems(product, items)).toEqual({
      ...product,
      comboItems: items,
    });
  });
});
