import { isSalvadoStockOrigin } from '../../../../../shared-utils/productStockOrigin';
import {
  resolveProductVariationPricing,
  type ProductVariationPricingValue,
} from '../../../../../shared-utils/productVariationPricing';

interface ProductCardPriceFields {
  unitPrice?: ProductVariationPricingValue;
  price?: ProductVariationPricingValue;
  unit_price?: ProductVariationPricingValue;
  promoPrice?: ProductVariationPricingValue;
  promo_price?: ProductVariationPricingValue;
  syncUnitPrice?: boolean | null;
  syncPromoPrice?: boolean | null;
  use_parent_price?: boolean | null;
  use_parent_promo_price?: boolean | null;
}

export interface MobileProductCardPricing {
  cardUnitPrice: number;
  cardPromoPrice: number;
  hasCardPromo: boolean;
  cardPrice: number;
}

/** Resolves each price owner before evaluating the promotion shown by the list card. */
export const resolveMobileProductCardPricing = (
  product: ProductCardPriceFields,
  singleVariation?: ProductCardPriceFields | null
): MobileProductCardPricing => {
  const effectiveVariationPricing = singleVariation
    ? resolveProductVariationPricing(
        {
          unitPrice:
            singleVariation.unitPrice ?? singleVariation.price ?? singleVariation.unit_price,
          promoPrice: singleVariation.promoPrice ?? singleVariation.promo_price,
          syncUnitPrice:
            singleVariation.syncUnitPrice ?? singleVariation.use_parent_price !== false,
          syncPromoPrice:
            singleVariation.syncPromoPrice ?? singleVariation.use_parent_promo_price !== false,
        },
        {
          unitPrice: product.unitPrice ?? product.price ?? product.unit_price,
          promoPrice: product.promoPrice ?? product.promo_price,
        }
      )
    : null;

  const cardUnitPrice = Number(
    singleVariation
      ? effectiveVariationPricing?.unitPrice ?? 0
      : product.unitPrice ?? product.price ?? product.unit_price ?? 0
  );
  const cardPromoPrice = Number(
    singleVariation
      ? effectiveVariationPricing?.promoPrice ?? 0
      : product.promoPrice ?? product.promo_price ?? 0
  );
  const hasCardPromo = cardPromoPrice > 0 && cardPromoPrice < cardUnitPrice;

  return {
    cardUnitPrice,
    cardPromoPrice,
    hasCardPromo,
    cardPrice: hasCardPromo ? cardPromoPrice : cardUnitPrice,
  };
};

export const isMobileProductStockLow = (stock: unknown, minStock: unknown): boolean =>
  Number(stock ?? 0) <= Number(minStock ?? 0);

export const getMobileProductCardActionAvailability = (product: {
  isVariation?: boolean;
  isParent?: boolean;
}) => ({
  canDuplicate: !product.isVariation,
  canShowLinkedOrders: !product.isParent,
});

export const getMobileProductVariationCardActionAvailability = (options: {
  canViewDetails: boolean;
  isLabelOnlyProfile: boolean;
  canShowActionsMenu: boolean;
}) => {
  const canViewVariationDetails = options.canViewDetails && !options.isLabelOnlyProfile;
  return {
    canViewDetails: canViewVariationDetails,
    canShowActionsMenu: !canViewVariationDetails && options.canShowActionsMenu,
  };
};

export const canShowMobileLinkedProductOrders = (options: {
  canEditProducts: boolean;
  isLabelOnlyProfile: boolean;
  showTrash: boolean;
}): boolean =>
  !options.isLabelOnlyProfile &&
  !options.showTrash &&
  options.canEditProducts;

export const canShowMobileProductPriceLabel = (options: {
  canEditProducts: boolean;
  isLabelOnlyProfile: boolean;
  showTrash: boolean;
  isMergedVariation?: boolean;
}): boolean =>
  options.canEditProducts &&
  !options.isLabelOnlyProfile &&
  !options.showTrash &&
  !options.isMergedVariation;

export const canShowMobileProductDeletionActions = (options: {
  canEditProducts: boolean;
  canDeleteProducts: boolean;
}): boolean => options.canEditProducts && options.canDeleteProducts;

export const canShowMobileSingleVariationReorganizationActions = (options: {
  canEditProducts: boolean;
  isLabelOnlyProfile: boolean;
  isDraft: boolean;
  isMerged: boolean;
  isVirtual: boolean;
  showTrash: boolean;
}): boolean =>
  options.canEditProducts &&
  !options.isLabelOnlyProfile &&
  !options.isDraft &&
  !options.isMerged &&
  !options.isVirtual &&
  !options.showTrash;

export const runMobileProductRestoreAction = (options: {
  canDeleteProducts: boolean;
  productId: string;
  onRestore: (productId: string) => void | Promise<void>;
  onPermissionDenied: () => void;
}): boolean => {
  if (!options.canDeleteProducts) {
    options.onPermissionDenied();
    return false;
  }

  void options.onRestore(options.productId);
  return true;
};

export const runMobileProductDeleteAction = (options: {
  canDeleteProducts: boolean;
  productId: string;
  isDraft: boolean;
  onDelete: (productId: string, isDraft: boolean) => void | Promise<void>;
  onPermissionDenied: () => void;
}): boolean => {
  if (!options.canDeleteProducts) {
    options.onPermissionDenied();
    return false;
  }

  void options.onDelete(options.productId, options.isDraft);
  return true;
};

export const canToggleProductActivationFromCardMenu = (options: {
  isFamilyParent: boolean;
  canDelete: boolean;
  isLabelOnlyProfile: boolean;
  isNonConventional: boolean;
}): boolean =>
  options.canDelete &&
  !options.isFamilyParent &&
  !options.isLabelOnlyProfile &&
  !options.isNonConventional;

export const getMobileErpStatusBadgeInteraction = (options: {
  canToggleActive: boolean;
  isDraft: boolean;
  isMerged: boolean;
  isParent: boolean;
  isNonConventional: boolean;
}): { canPress: boolean; disabled: boolean } => ({
  canPress:
    !options.isDraft &&
    !options.isParent &&
    !options.isNonConventional &&
    (options.canToggleActive || options.isMerged),
  disabled:
    options.isDraft ||
    options.isParent ||
    options.isNonConventional ||
    (!options.canToggleActive && !options.isMerged),
});

export const getMobileCatalogStatusBadgeInteraction = (options: {
  canToggleCatalog: boolean;
  isDraft: boolean;
  isMerged: boolean;
}): { canPress: boolean; disabled: boolean } => ({
  canPress: !options.isDraft && (options.canToggleCatalog || options.isMerged),
  disabled: options.isDraft || (!options.canToggleCatalog && !options.isMerged),
});

export const getMobileCatalogStatusBadgeAccessibilityHint = (options: {
  canToggleCatalog: boolean;
  isDraft: boolean;
  isMerged: boolean;
  disabledReason?: string;
}): string | undefined => {
  if (options.isDraft) {
    return 'Produtos em rascunho ficam ocultos e não podem ser publicados no Catálogo Digital.';
  }
  if (options.isMerged) {
    return (
      options.disabledReason ||
      'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
    );
  }
  if (!options.canToggleCatalog) {
    return 'Seu perfil não possui permissão para gerenciar o catálogo.';
  }
  return undefined;
};

export const resolveCanonicalOpportunityBadge = (
  product: any,
  oppName?: string | null
): { label: string; isSalvado: boolean } | null => {
  const isSalvado = isSalvadoStockOrigin(product, null, oppName);

  if (isSalvado) {
    return { label: 'Queima dos Salvados', isSalvado: true };
  }

  if (oppName && oppName.trim()) {
    return { label: oppName.trim(), isSalvado: false };
  }

  return null;
};

