import { describe, expect, it } from 'vitest';
import { isSingleProductVariationFormMode } from '../../../../../../shared-utils/productVariationMode';

describe('isSingleProductVariationFormMode', () => {
  it('retains family mode for drafts with zero or one provisional variation', () => {
    expect(
      isSingleProductVariationFormMode(
        { status: 'draft', has_variations: true },
        1,
        false
      )
    ).toBe(false);
    expect(
      isSingleProductVariationFormMode(
        { isDraft: true, hasVariations: true },
        0,
        true
      )
    ).toBe(false);
  });

  it('keeps a draft simple product in inherited single-variation mode', () => {
    expect(
      isSingleProductVariationFormMode(
        { isDraft: true, hasVariations: false },
        1,
        false
      )
    ).toBe(true);
    expect(
      isSingleProductVariationFormMode(
        { status: 'draft', has_variations: false },
        0,
        true
      )
    ).toBe(true);
  });

  it("derives a completed product's mode from its operational row count", () => {
    expect(
      isSingleProductVariationFormMode(
        { status: 'hidden', hasVariations: true },
        1,
        false
      )
    ).toBe(true);
    expect(
      isSingleProductVariationFormMode(
        { status: 'hidden', hasVariations: false },
        2,
        false
      )
    ).toBe(false);
  });
});
