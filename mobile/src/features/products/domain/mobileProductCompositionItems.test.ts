import { describe, expect, it } from 'vitest';
import { getMobileProductRootCompositionItems } from './mobileProductCompositionItems';

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
});
