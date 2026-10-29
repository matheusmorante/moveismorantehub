import type {
  CatalogCharacteristicRequirement,
  CatalogCharacteristicCheckOptions,
} from './types';
import { TEST_PRODUCT_CATALOG_PUBLICATION_ERROR } from './types';
import { checkEcomLegibility } from './legibilityValidation';
import { isTestProduct } from '../isTestProduct';

/**
 * Valida se um produto ou variação pode ser publicado no Catálogo Digital,
 * retornando lista detalhada de pendências e aviso de rascunho se aplicável.
 */
export const validateCatalogPublication = (
  parentProduct?: any,
  variation?: any,
  isVariation?: boolean,
  categoryRequirements: readonly CatalogCharacteristicRequirement[] = [],
  options: CatalogCharacteristicCheckOptions = {}
): { isValid: boolean; errorMessage?: string } => {
  const catalogProduct = {
    ...parentProduct,
    variations: isVariation && variation ? [variation] : parentProduct?.variations,
  };
  if (isTestProduct(catalogProduct)) {
    return { isValid: false, errorMessage: TEST_PRODUCT_CATALOG_PUBLICATION_ERROR };
  }

  const isDraft =
    Boolean(parentProduct?.isDraft) ||
    Boolean(parentProduct?.is_draft) ||
    parentProduct?.status === 'draft';

  const varImages =
    variation?.images && variation.images.length > 0
      ? variation.images
      : variation?.image_url
        ? String(variation.image_url).split(',').filter(Boolean)
        : parentProduct?.images || [];

  const effectiveProduct: Record<string, any> = {
    ...parentProduct,
    ...(
      isVariation && variation
        ? { variations: [variation] }
        : parentProduct?.variations?.length
          ? {}
          : parentProduct?.product_variations?.length
            ? { variations: parentProduct.product_variations }
            : parentProduct?.allVariations?.length
              ? { variations: parentProduct.allVariations }
              : {}
    ),
    name:
      parentProduct?.name ||
      parentProduct?.title ||
      (parentProduct?.description
        ? String(parentProduct.description).split('\n')[0].trim()
        : undefined),
    description:
      parentProduct?.ecommerceDescription ||
      parentProduct?.ecommerce_description ||
      parentProduct?.description,
    ...(isVariation && variation
      ? {
          name:
            variation.name ||
            parentProduct?.name ||
            parentProduct?.title ||
            (parentProduct?.description
              ? String(parentProduct.description).split('\n')[0].trim()
              : undefined),
          description:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          ecommerceDescription:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          unitPrice:
            variation.syncUnitPrice !== false
              ? (parentProduct?.unitPrice ?? parentProduct?.unit_price ?? parentProduct?.price)
              : (variation.unitPrice ??
                variation.price ??
                parentProduct?.unitPrice ??
                parentProduct?.unit_price ??
                parentProduct?.price),
          images: varImages,
          width:
            variation.syncWidth !== false
              ? parentProduct?.width
              : (variation.width ?? parentProduct?.width),
          height:
            variation.syncHeight !== false
              ? parentProduct?.height
              : (variation.height ?? parentProduct?.height),
          depth:
            variation.syncDepth !== false
              ? parentProduct?.depth
              : (variation.depth ?? parentProduct?.depth),
        }
      : {}),
  };

  const ecomResult = checkEcomLegibility(effectiveProduct, categoryRequirements, options);
  if (!ecomResult.isLegible) {
    const errorList = ecomResult.errors;
    let message = '';
    if (errorList.length === 1) {
      message = `Não foi possível publicar no Catálogo Digital.\nCampo obrigatório pendente:\n• ${errorList[0]}`;
    } else {
      message = `Não foi possível publicar no Catálogo Digital.\nCampos obrigatórios pendentes:\n• ${errorList.join('\n• ')}`;
    }
    if (isDraft) {
      message +=
        '\n\nO produto é um rascunho. Conclua o cadastro do produto para salvá-lo como finalizado.';
    }
    return {
      isValid: false,
      errorMessage: message,
    };
  }

  if (isDraft) {
    return {
      isValid: false,
      errorMessage:
        'Não foi possível publicar no Catálogo Digital: o produto é um rascunho. Conclua o cadastro salvando-o como finalizado para poder publicá-lo.',
    };
  }

  return { isValid: true };
};
