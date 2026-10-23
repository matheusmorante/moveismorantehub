import {
  getMobileProductCardActionAvailability,
  isMobileProductStockLow,
  isSalvadoProduct,
  resolveCanonicalOpportunityBadge,
} from '../domain/mobileProductCardRules';
import { isNonConventionalProduct } from '../../../../../shared-utils/productActivationValidation';
import { useMobileProductMetadata } from './useMobileProductMetadata';
import { getSingleVariationDisplayName } from '../domain/mobileProductCardDisplay';
import { normalizeVariationSku } from '../domain/productSku';

interface UseMobileProductCardStateOptions {
  product: any;
  isLabelOnlyProfile?: boolean;
  canPrintLabels?: boolean;
  canEdit?: boolean;
}

/**
 * Hook de domínio que deriva todos os estados de apresentação de um card móvel de produto:
 * títulos com suporte a variação única, imagem com fallback, status de canais, preços,
 * cálculo de estoque baixo e badges relacionais.
 */
export function useMobileProductCardState({
  product,
  isLabelOnlyProfile = false,
  canPrintLabels = false,
  canEdit = false,
}: UseMobileProductCardStateOptions) {
  const variations = product.allVariations || [];
  const hasVars = variations.length > 0;
  const isParent = Boolean(product.isParent || hasVars);
  const singleVariation = isParent && variations.length === 1 ? variations[0] : null;
  const isSingleVariationCard = Boolean(singleVariation);
  const hasExpandableVars = isParent && variations.length > 1;

  const isSingleVariationMerged = Boolean(
    singleVariation?.merged_to_variation_id || singleVariation?.mergedToVariationId
  );
  const isParentMerged = Boolean(
    product.isMerged ||
      (variations.length > 0 &&
        variations.every((v: any) => Boolean(v.merged_to_variation_id || v.mergedToVariationId)))
  );
  const isMerged = isSingleVariationMerged || isParentMerged;

  const isDraft = Boolean(product.isDraft || product.is_draft || product.status === 'draft');
  const cardActionAvailability = getMobileProductCardActionAvailability(product);
  const cardStatus = singleVariation?.status || product.status || 'hidden';
  const isPublished = !isDraft && cardStatus === 'published';
  const isActive =
    !isDraft &&
    (singleVariation ? singleVariation.active !== false : product.active !== false) &&
    !product.deleted;

  const displayTitle = singleVariation
    ? getSingleVariationDisplayName(product, singleVariation)
    : product.name || product.description || 'Produto sem título';

  const variationProductImage = Array.isArray(singleVariation?.images)
    ? singleVariation.images[0]
    : typeof singleVariation?.images === 'string'
      ? singleVariation.images.split(',').find(Boolean)
      : singleVariation?.image_url || singleVariation?.imageUrl;

  const parentProductImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'string'
      ? product.images.split(',').find(Boolean)
      : null;

  const cardImage = variationProductImage || parentProductImage;

  const cardUnitPrice = Number(
    singleVariation?.unitPrice ?? singleVariation?.price ?? product.unitPrice ?? 0
  );
  const cardPromoPrice = Number(
    singleVariation?.promoPrice ?? singleVariation?.promo_price ?? product.promoPrice ?? 0
  );
  const hasCardPromo = cardPromoPrice > 0 && cardPromoPrice < cardUnitPrice;
  const cardPrice = hasCardPromo ? cardPromoPrice : cardUnitPrice;

  const cardStock = Number(singleVariation?.stock ?? product.stock ?? 0);
  const cardMinStock = Number(
    singleVariation?.minStock ??
      singleVariation?.min_stock ??
      product.minStock ??
      product.min_stock ??
      0
  );
  const isLowStock = isMobileProductStockLow(cardStock, cardMinStock);
  const cardUnit = singleVariation?.unit || product.unit || 'UN';
  const canShowVariationMenu = isLabelOnlyProfile ? canPrintLabels : canEdit;

  const { oppName, supplierNames } = useMobileProductMetadata(product);
  const isSalvado = isSalvadoProduct(product) || isSalvadoProduct(singleVariation);
  const isNonConventional =
    isNonConventionalProduct(product) || isNonConventionalProduct(singleVariation);
  const oppBadgeInfo = resolveCanonicalOpportunityBadge(
    { ...product, ...(isSalvado ? { productKind: 'salvado' } : {}) },
    oppName
  );

  const parentCode = product.code || product.sku || '-';
  const displaySku = singleVariation
    ? normalizeVariationSku(
        singleVariation.sku ||
          singleVariation.code ||
          product.sku ||
          product.code
      ) ||
      product.code ||
      parentCode
    : product.code || (product.sku ? normalizeVariationSku(product.sku) : '') || parentCode;

  return {
    variations,
    hasVars,
    isParent,
    singleVariation,
    isSingleVariationCard,
    hasExpandableVars,
    isSingleVariationMerged,
    isMerged,
    isDraft,
    cardActionAvailability,
    cardStatus,
    isPublished,
    isActive,
    displayTitle,
    cardImage,
    cardUnitPrice,
    cardPromoPrice,
    hasCardPromo,
    cardPrice,
    cardStock,
    isLowStock,
    cardUnit,
    canShowVariationMenu,
    oppName,
    supplierNames,
    isSalvado,
    isNonConventional,
    oppBadgeInfo,
    displaySku,
  };
}
