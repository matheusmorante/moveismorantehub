import { describe, expect, it, vi } from 'vitest';
import { isNonConventionalProduct } from '../../../../../shared-utils/productActivationValidation';
import { isSalvadoStockOrigin } from '../../../../../shared-utils/productStockOrigin';
import {
  canShowMobileLinkedProductOrders,
  canShowMobileProductDeletionActions,
  canShowMobileProductPriceLabel,
  canShowMobileSingleVariationReorganizationActions,
  canToggleProductActivationFromCardMenu,
  getMobileCatalogStatusBadgeAccessibilityHint,
  getMobileCatalogStatusBadgeInteraction,
  getMobileErpStatusBadgeInteraction,
  getMobileProductCardActionAvailability,
  resolveMobileProductCardPricing,
  getMobileProductVariationCardActionAvailability,
  isMobileProductStockLow,
  runMobileProductDeleteAction,
  runMobileProductRestoreAction,
  resolveCanonicalOpportunityBadge,
} from './mobileProductCardRules';

describe('isMobileProductStockLow', () => {
  it('marks stock at or below the configured minimum as low', () => {
    expect(isMobileProductStockLow(2, 3)).toBe(true);
    expect(isMobileProductStockLow(3, 3)).toBe(true);
  });

  it('does not mark stock above the minimum as low', () => {
    expect(isMobileProductStockLow(4, 3)).toBe(false);
  });

  it('uses zero when stock or minimum stock is missing, like the ERP card', () => {
    expect(isMobileProductStockLow(undefined, undefined)).toBe(true);
    expect(isMobileProductStockLow(1, undefined)).toBe(false);
  });
});

describe('resolveMobileProductCardPricing', () => {
  const parent = { unitPrice: 100, promoPrice: 80 };

  it('usa a promoção do pai quando a variação única a herda', () => {
    expect(
      resolveMobileProductCardPricing(parent, {
        unitPrice: 100,
        promoPrice: undefined,
        syncUnitPrice: true,
        syncPromoPrice: true,
      })
    ).toEqual({
      cardUnitPrice: 100,
      cardPromoPrice: 80,
      hasCardPromo: true,
      cardPrice: 80,
    });
  });

  it.each([
    ['ausente', undefined],
    ['zero', 0],
    ['inválida', 'preço inválido'],
  ])('não troca promoção própria %s pela promoção do pai', (_description, ownPromoPrice) => {
    const card = resolveMobileProductCardPricing(parent, {
      unitPrice: 100,
      promoPrice: ownPromoPrice,
      syncUnitPrice: true,
      syncPromoPrice: false,
    });

    expect(card.hasCardPromo).toBe(false);
    expect(card.cardPrice).toBe(100);
  });

  it.each([undefined, 0, 100, 120, 'preço inválido'])(
    'não exibe promoção ausente, zero, igual, maior ou inválida no pai (%s)',
    (promoPrice) => {
      const card = resolveMobileProductCardPricing({ unitPrice: 100, promoPrice });

      expect(card.hasCardPromo).toBe(false);
      expect(card.cardPrice).toBe(100);
    }
  );
});

describe('getMobileProductCardActionAvailability', () => {
  it('only offers duplicate for non-variations and linked orders for non-parents', () => {
    expect(getMobileProductCardActionAvailability({})).toEqual({
      canDuplicate: true,
      canShowLinkedOrders: true,
    });
    expect(getMobileProductCardActionAvailability({ isVariation: true })).toEqual({
      canDuplicate: false,
      canShowLinkedOrders: true,
    });
    expect(getMobileProductCardActionAvailability({ isParent: true })).toEqual({
      canDuplicate: true,
      canShowLinkedOrders: false,
    });
  });
});

describe('getMobileProductVariationCardActionAvailability', () => {
  it('shows per-variation details instead of the action menu for read-only catalog profiles', () => {
    expect(
      getMobileProductVariationCardActionAvailability({
        canViewDetails: true,
        isLabelOnlyProfile: false,
        canShowActionsMenu: true,
      })
    ).toEqual({ canViewDetails: true, canShowActionsMenu: false });
  });

  it('preserves the existing eligible menu for editable and label-only profiles', () => {
    expect(
      getMobileProductVariationCardActionAvailability({
        canViewDetails: false,
        isLabelOnlyProfile: false,
        canShowActionsMenu: true,
      })
    ).toEqual({ canViewDetails: false, canShowActionsMenu: true });
    expect(
      getMobileProductVariationCardActionAvailability({
        canViewDetails: true,
        isLabelOnlyProfile: true,
        canShowActionsMenu: true,
      })
    ).toEqual({ canViewDetails: false, canShowActionsMenu: true });
  });
});

describe('canShowMobileLinkedProductOrders', () => {
  const allowed = {
    canEditProducts: true,
    isLabelOnlyProfile: false,
    showTrash: false,
  };

  it('allows product editors, as in the ERP action menu', () => {
    expect(canShowMobileLinkedProductOrders(allowed)).toBe(true);
  });

  it.each([
    { canEditProducts: false },
    { isLabelOnlyProfile: true },
    { showTrash: true },
  ])('hides linked orders outside the ERP action-menu context (%o)', (override) => {
    expect(canShowMobileLinkedProductOrders({ ...allowed, ...override })).toBe(false);
  });
});

describe('canShowMobileProductPriceLabel', () => {
  const allowed = {
    canEditProducts: true,
    isLabelOnlyProfile: false,
    showTrash: false,
  };

  it('allows editable products regardless of the separate stock-label permission', () => {
    expect(canShowMobileProductPriceLabel(allowed)).toBe(true);
  });

  it.each([
    { canEditProducts: false },
    { isLabelOnlyProfile: true },
    { showTrash: true },
    { isMergedVariation: true },
  ])('hides price labels outside the ERP eligible product action (%o)', (override) => {
    expect(canShowMobileProductPriceLabel({ ...allowed, ...override })).toBe(false);
  });
});

describe('canShowMobileProductDeletionActions', () => {
  it('requires both product editing and deletion permissions, like the ERP action-menu gate', () => {
    expect(
      canShowMobileProductDeletionActions({ canEditProducts: true, canDeleteProducts: true })
    ).toBe(true);
  });

  it.each([
    { canEditProducts: false, canDeleteProducts: true },
    { canEditProducts: true, canDeleteProducts: false },
    { canEditProducts: false, canDeleteProducts: false },
  ])('hides discard and trash actions unless both permissions are granted (%o)', (permissions) => {
    expect(canShowMobileProductDeletionActions(permissions)).toBe(false);
  });
});

describe('canShowMobileSingleVariationReorganizationActions', () => {
  const allowed = {
    canEditProducts: true,
    isLabelOnlyProfile: false,
    isDraft: false,
    isMerged: false,
    isVirtual: false,
    showTrash: false,
  };

  it('shows move and merge only for an editable, saved, operational variation', () => {
    expect(canShowMobileSingleVariationReorganizationActions(allowed)).toBe(true);
  });

  it.each([
    { canEditProducts: false },
    { isLabelOnlyProfile: true },
    { isDraft: true },
    { isMerged: true },
    { isVirtual: true },
    { showTrash: true },
  ])('hides move and merge when the ERP action is unavailable (%o)', (override) => {
    expect(
      canShowMobileSingleVariationReorganizationActions({ ...allowed, ...override })
    ).toBe(false);
  });
});

describe('runMobileProductRestoreAction', () => {
  it('shows the denial feedback without dispatching restore when delete permission is absent', () => {
    const onRestore = vi.fn();
    const onPermissionDenied = vi.fn();

    const dispatched = runMobileProductRestoreAction({
      canDeleteProducts: false,
      productId: 'product-1',
      onRestore,
      onPermissionDenied,
    });

    expect(dispatched).toBe(false);
    expect(onPermissionDenied).toHaveBeenCalledOnce();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('dispatches the existing restore action when delete permission is granted', () => {
    const onRestore = vi.fn();
    const onPermissionDenied = vi.fn();

    const dispatched = runMobileProductRestoreAction({
      canDeleteProducts: true,
      productId: 'product-1',
      onRestore,
      onPermissionDenied,
    });

    expect(dispatched).toBe(true);
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith('product-1');
    expect(onPermissionDenied).not.toHaveBeenCalled();
  });
});

describe('runMobileProductDeleteAction', () => {
  it('shows permission feedback without dispatching discard when access is absent', () => {
    const onDelete = vi.fn();
    const onPermissionDenied = vi.fn();

    const dispatched = runMobileProductDeleteAction({
      canDeleteProducts: false,
      productId: 'product-1',
      isDraft: true,
      onDelete,
      onPermissionDenied,
    });

    expect(dispatched).toBe(false);
    expect(onPermissionDenied).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('dispatches the discard action only after the permission gate passes', () => {
    const onDelete = vi.fn();
    const onPermissionDenied = vi.fn();

    const dispatched = runMobileProductDeleteAction({
      canDeleteProducts: true,
      productId: 'product-1',
      isDraft: true,
      onDelete,
      onPermissionDenied,
    });

    expect(dispatched).toBe(true);
    expect(onDelete).toHaveBeenCalledWith('product-1', true);
    expect(onPermissionDenied).not.toHaveBeenCalled();
  });
});

describe('canToggleProductActivationFromCardMenu', () => {
  const allowed = {
    isFamilyParent: false,
    canDelete: true,
    isLabelOnlyProfile: false,
    isNonConventional: false,
  };

  it('allows a simple product action when the profile and stock type permit it', () => {
    expect(canToggleProductActivationFromCardMenu(allowed)).toBe(true);
  });

  it('keeps a multi-variation family parent status derived and non-interactive', () => {
    expect(canToggleProductActivationFromCardMenu({ ...allowed, isFamilyParent: true })).toBe(
      false
    );
  });

  it.each([
    { canDelete: false },
    { isLabelOnlyProfile: true },
    { isNonConventional: true },
  ])('preserves existing permission/profile/stock restrictions (%o)', (override) => {
    expect(canToggleProductActivationFromCardMenu({ ...allowed, ...override })).toBe(false);
  });
});

describe('getMobileErpStatusBadgeInteraction', () => {
  const allowed = {
    canToggleActive: true,
    isDraft: false,
    isMerged: false,
    isParent: false,
    isNonConventional: false,
  };

  it('allows an authorized saved conventional product to toggle status', () => {
    expect(getMobileErpStatusBadgeInteraction(allowed)).toEqual({
      canPress: true,
      disabled: false,
    });
  });

  it('disables draft status even when the profile can toggle products', () => {
    expect(
      getMobileErpStatusBadgeInteraction({ ...allowed, isDraft: true })
    ).toEqual({ canPress: false, disabled: true });
  });

  it('keeps the merged-variation explanation available through the badge', () => {
    expect(
      getMobileErpStatusBadgeInteraction({ ...allowed, isMerged: true })
    ).toEqual({ canPress: true, disabled: false });
  });

  it.each([
    { canToggleActive: false },
    { isParent: true },
    { isNonConventional: true },
  ])('blocks status interaction for the existing blocked states (%o)', (override) => {
    expect(getMobileErpStatusBadgeInteraction({ ...allowed, ...override })).toEqual({
      canPress: false,
      disabled: true,
    });
  });
});

describe('getMobileCatalogStatusBadgeInteraction', () => {
  const allowed = { canToggleCatalog: true, isDraft: false, isMerged: false };

  it('allows catalog status changes for an authorized finished product', () => {
    expect(getMobileCatalogStatusBadgeInteraction(allowed)).toEqual({
      canPress: true,
      disabled: false,
    });
  });

  it('disables catalog status changes for drafts, even when authorized', () => {
    expect(getMobileCatalogStatusBadgeInteraction({ ...allowed, isDraft: true })).toEqual({
      canPress: false,
      disabled: true,
    });
  });

  it('preserves the merged-variation explanation path', () => {
    expect(getMobileCatalogStatusBadgeInteraction({ ...allowed, isMerged: true })).toEqual({
      canPress: true,
      disabled: false,
    });
  });

  it('keeps an unauthorized finished product disabled', () => {
    expect(
      getMobileCatalogStatusBadgeInteraction({ ...allowed, canToggleCatalog: false })
    ).toEqual({ canPress: false, disabled: true });
  });
});

describe('getMobileCatalogStatusBadgeAccessibilityHint', () => {
  it('explains the missing catalog permission for a finished product', () => {
    expect(
      getMobileCatalogStatusBadgeAccessibilityHint({
        canToggleCatalog: false,
        isDraft: false,
        isMerged: false,
      })
    ).toBe('Seu perfil não possui permissão para gerenciar o catálogo.');
  });

  it('keeps draft and merged explanations ahead of the permission hint', () => {
    expect(
      getMobileCatalogStatusBadgeAccessibilityHint({
        canToggleCatalog: false,
        isDraft: true,
        isMerged: false,
      })
    ).toBe('Produtos em rascunho ficam ocultos e não podem ser publicados no Catálogo Digital.');
    expect(
      getMobileCatalogStatusBadgeAccessibilityHint({
        canToggleCatalog: false,
        isDraft: false,
        isMerged: true,
        disabledReason: 'Esta variação foi mesclada.',
      })
    ).toBe('Esta variação foi mesclada.');
  });

  it('does not add a blocking hint to an authorized finished product', () => {
    expect(
      getMobileCatalogStatusBadgeAccessibilityHint({
        canToggleCatalog: true,
        isDraft: false,
        isMerged: false,
      })
    ).toBeUndefined();
  });
});

describe('ERP status badge visibility for Salvados', () => {
  it('uses the shared product and opportunity aliases before rendering the badge', () => {
    expect(isSalvadoStockOrigin({ stock_origin: 'salvados' })).toBe(true);
    expect(isSalvadoStockOrigin({ product_kind: 'salvados' })).toBe(true);
    expect(
      isSalvadoStockOrigin({ opportunity_id: 'opportunity-1' }, null, 'Queima dos Salvados')
    ).toBe(true);
    expect(isSalvadoStockOrigin({ productKind: 'normal' }, null, 'Queima dos Salvados')).toBe(true);
    expect(isSalvadoStockOrigin({ productKind: 'normal' })).toBe(false);
  });
});

describe('isNonConventionalProduct', () => {
  it('recognizes Usados in parent and variation fields and leaves Normal unrestricted', () => {
    expect(isNonConventionalProduct({ productKind: 'usados' })).toBe(true);
    expect(isNonConventionalProduct({ stock_origin: 'usados' })).toBe(true);
    expect(isNonConventionalProduct({ productKind: 'normal' })).toBe(false);
  });
});

describe('resolveCanonicalOpportunityBadge', () => {
  it('canonicalizes salvado products to "Queima dos Salvados"', () => {
    expect(resolveCanonicalOpportunityBadge({ productKind: 'salvado' })).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
    expect(resolveCanonicalOpportunityBadge({ condition: 'salvado' }, 'Salvados')).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
    expect(resolveCanonicalOpportunityBadge({ stock_origin: 'salvados' })).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
    expect(resolveCanonicalOpportunityBadge({}, 'Queima dos Salvados 2026')).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
  });

  it('preserves non-salvado opportunity names and returns null when empty', () => {
    expect(resolveCanonicalOpportunityBadge({}, 'Semana do Cliente')).toEqual({
      label: 'Semana do Cliente',
      isSalvado: false,
    });
    expect(resolveCanonicalOpportunityBadge({}, null)).toBeNull();
    expect(resolveCanonicalOpportunityBadge({}, '')).toBeNull();
  });
});
