import { describe, expect, it } from 'vitest';
import {
  canShowProductVariationActionsMenu,
  getProductIdentificationLabelActionAvailability,
  hasProductPermission,
  hasRolePermission,
} from '../../../../../shared-utils/productPermissions';

describe('product and module role permissions', () => {
  it('uses configured roles over defaults and normalizes aliases', () => {
    expect(hasRolePermission('viewMetaCatalog', ['seller'], ['manager'])).toBe(false);
    expect(
      hasRolePermission('viewMetaCatalog', ['seller'], ['manager'], {
        viewMetaCatalog: ['vendedor'],
      })
    ).toBe(true);
    expect(
      hasRolePermission('viewMetaCatalog', ['manager'], ['manager'], {
        viewMetaCatalog: [],
      })
    ).toBe(false);
  });

  it('grants administrator access without treating unknown product permissions as valid', () => {
    expect(hasRolePermission('viewMetaCatalog', ['admin'], ['manager'])).toBe(true);
    expect(hasProductPermission('viewMetaCatalog', ['admin'])).toBe(false);
  });
});

describe('product identification label action availability', () => {
  it('offers the label action for a permitted active single variation', () => {
    expect(
      getProductIdentificationLabelActionAvailability({
        canPrint: true,
        hasSingleVariation: true,
        isDraft: false,
        isMerged: false,
      })
    ).toEqual({ canOpenMenu: true, canPrintLabel: true });
  });

  it('hides the label menu for drafts and the print action for merged variations', () => {
    expect(
      getProductIdentificationLabelActionAvailability({
        canPrint: true,
        hasSingleVariation: true,
        isDraft: true,
        isMerged: false,
      })
    ).toEqual({ canOpenMenu: false, canPrintLabel: false });
    expect(
      getProductIdentificationLabelActionAvailability({
        canPrint: true,
        hasSingleVariation: true,
        isDraft: false,
        isMerged: true,
      })
    ).toEqual({ canOpenMenu: true, canPrintLabel: false });
  });

  it('does not offer the label menu without permission or a single variation', () => {
    expect(
      getProductIdentificationLabelActionAvailability({
        canPrint: false,
        hasSingleVariation: true,
        isDraft: false,
        isMerged: false,
      })
    ).toEqual({ canOpenMenu: false, canPrintLabel: false });
    expect(
      getProductIdentificationLabelActionAvailability({
        canPrint: true,
        hasSingleVariation: false,
        isDraft: false,
        isMerged: false,
      })
    ).toEqual({ canOpenMenu: false, canPrintLabel: false });
  });
});

describe('product variation actions menu availability', () => {
  it('hides the menu for label-only profiles without identification permission', () => {
    expect(
      canShowProductVariationActionsMenu({
        isIdentificationLabelOnlyProfile: true,
        canPrintIdentificationLabel: false,
      })
    ).toBe(false);
  });

  it('keeps the menu for label-only profiles with identification permission', () => {
    expect(
      canShowProductVariationActionsMenu({
        isIdentificationLabelOnlyProfile: true,
        canPrintIdentificationLabel: true,
      })
    ).toBe(true);
  });

  it('keeps operational menus for other profiles even without label permission', () => {
    expect(
      canShowProductVariationActionsMenu({
        isIdentificationLabelOnlyProfile: false,
        canPrintIdentificationLabel: false,
      })
    ).toBe(true);
  });
});
