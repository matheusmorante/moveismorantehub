import type React from 'react';
import type Product from '@/pages/types/product.type';
import { getProductCategoryRootNames } from '../../../../../../../../shared-utils/productCategoryResolution';
import { searchProductCategories } from '../../../../../../../../shared-utils/productCategorySearch';

export { getProductCategoryRootNames, searchProductCategories };

export interface ProductCategoryOption {
  id: string;
  name: string;
  parents?: string[];
}

export function filterProductSelectableCategories(
  categories: ProductCategoryOption[],
): ProductCategoryOption[] {
  return categories.filter((category) => {
    // Categorias raiz representam ambientes e não podem ser selecionadas diretamente no produto.
    const isRootCategory = !category.parents || category.parents.length === 0;
    return !isRootCategory;
  });
}

/** Updates category IDs and recalculates derived environments consistently on product state. */
export function applyProductCategorySelection(
  prev: Partial<Product>,
  nextIds: string[],
  availableCategories: readonly ProductCategoryOption[],
): Partial<Product> {
  const allEnvs = getProductCategoryRootNames(nextIds, [...availableCategories]);
  const detectedEnv = prev.environment && allEnvs.includes(prev.environment)
    ? prev.environment
    : allEnvs[0] || '';
  return {
    ...prev,
    categoryIds: nextIds,
    environment: detectedEnv,
    availableEnvironments: allEnvs,
  };
}

/** Removes a single validation error key if validation state tracking is active. */
export function clearProductValidationField(
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>> | undefined,
  field: string,
): void {
  if (!setValidationErrors) return;
  setValidationErrors((prev) => {
    if (!(field in prev)) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });
}
