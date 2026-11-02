import { normalizeSearchTerm } from './productText';

export const PRODUCT_CATEGORY_SEARCH_MIN_LENGTH = 3;
export const PRODUCT_CATEGORY_SEARCH_MAX_SUGGESTIONS = 5;

export interface ProductCategorySearchOption {
  id: string;
  name: string;
  parents?: readonly string[];
}

/** Searches selectable categories by their name or a directly linked parent name. */
export function searchProductCategories<T extends ProductCategorySearchOption>(
  selectableCategories: readonly T[],
  allCategories: readonly ProductCategorySearchOption[],
  searchTerm: string
): T[] {
  const term = normalizeSearchTerm(searchTerm);
  if (term.length < PRODUCT_CATEGORY_SEARCH_MIN_LENGTH) return [];

  return selectableCategories.filter((category) => {
    if (normalizeSearchTerm(category.name).includes(term)) return true;

    return (category.parents || []).some((parentId) => {
      const parentName = allCategories.find((item) => item.id === parentId)?.name;
      return Boolean(parentName && normalizeSearchTerm(parentName).includes(term));
    });
  });
}
