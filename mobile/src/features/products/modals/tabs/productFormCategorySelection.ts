import type { MobileCategory } from '../../services/mobileCategoryService';
import { getProductCategoryRootNames } from '../../../../../../shared-utils/productCategoryResolution';

interface BuildProductFormCategorySelectionParams {
  categoryIds?: string[];
  categoryId?: string;
  categoryIdToToggle: string;
  categories: MobileCategory[];
  categoryHierarchy: MobileCategory[];
  categoryHierarchyReady: boolean;
}

export function buildProductFormCategorySelection({
  categoryIds,
  categoryId,
  categoryIdToToggle,
  categories,
  categoryHierarchy,
  categoryHierarchyReady,
}: BuildProductFormCategorySelectionParams) {
  const currentIds: string[] =
    Array.isArray(categoryIds) && categoryIds.length > 0
      ? categoryIds
      : categoryId
        ? [categoryId]
        : [];
  const isChecked = currentIds.includes(categoryIdToToggle);
  const nextIds = isChecked
    ? currentIds.filter((id) => id !== categoryIdToToggle)
    : [...currentIds, categoryIdToToggle];
  const firstSelected = categories.find((category) => category.id === nextIds[0]);
  const selectedCategoryNames = nextIds
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const availableEnvironments = categoryHierarchyReady
    ? getProductCategoryRootNames(nextIds, categoryHierarchy)
    : [];

  return {
    nextIds,
    categoryName: firstSelected?.name || '',
    categoryNames: selectedCategoryNames,
    availableEnvironments,
  };
}
