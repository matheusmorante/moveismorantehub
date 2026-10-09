import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { isMobileEcommerceLegible } from './productRegistrationRules';

export const prepareMobileProductSaveState = (
  product: any,
  formData: any,
  saveAsDraft: boolean
) => {
  const variations = Array.isArray(formData.variations) ? formData.variations : [];
  const isNonConventional =
    formData.productKind === 'salvado' ||
    formData.productKind === 'usado' ||
    formData.product_kind === 'salvado' ||
    formData.product_kind === 'usado' ||
    formData.condition === 'salvado' ||
    formData.condition === 'usado';
  const forceInactive = saveAsDraft || isNonConventional;
  const wasDraft =
    !product?.id ||
    Boolean(
      formData.isDraft || product?.is_draft || product?.isDraft || product?.status === 'draft'
    );
  const isCompletingDraft = !saveAsDraft && wasDraft;
  const isCatalogTestProduct = isTestProduct(product) || isTestProduct(formData);
  const isPublished = (product?.status || formData.status) === 'published';
  const status = saveAsDraft
    ? 'draft'
    : !isCatalogTestProduct && isPublished && isMobileEcommerceLegible(formData)
      ? 'published'
      : 'hidden';

  return {
    isDraft: saveAsDraft,
    active: forceInactive ? false : isCompletingDraft ? true : formData.active !== false,
    status,
    variations: variations.map((variation: any) => ({
      ...variation,
      active: forceInactive ? false : isCompletingDraft ? true : variation.active !== false,
      status: saveAsDraft
        ? variation.status || 'draft'
        : status === 'published'
          ? variation.status === 'draft'
            ? 'hidden'
            : variation.status || 'published'
          : 'hidden',
    })),
  };
};
