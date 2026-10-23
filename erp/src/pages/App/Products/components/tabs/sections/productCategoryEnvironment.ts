import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { getProductCategoryRootNames } from '../../../../../../../../shared-utils/productCategoryResolution';

export { getProductCategoryRootNames };

export interface ProductCategoryOption {
  id: string;
  name: string;
  parents?: string[];
}
export function filterProductSelectableCategories(
  categories: ProductCategoryOption[]
): ProductCategoryOption[] {
  return categories.filter((category) => {
    // Categorias raiz representam ambientes e não podem ser selecionadas diretamente no produto.
    const isRootCategory = !category.parents || category.parents.length === 0;
    const isEnvironment = isRootCategory;

    return !isEnvironment;
  });
}

export function searchProductCategories(
  selectableCategories: ProductCategoryOption[],
  allCategories: ProductCategoryOption[],
  searchTerm: string
): ProductCategoryOption[] {
  const term = normalizeSearchTerm(searchTerm);
  if (term.length < 2) {
    return [];
  }

  return selectableCategories.filter((cat) => {
    const catNameMatches = normalizeSearchTerm(cat.name).includes(term);
    if (catNameMatches) return true;

    const parentNames = (cat.parents || [])
      .map((pid) => allCategories.find((item) => item.id === pid)?.name || '')
      .filter(Boolean);

    return parentNames.some((pName) => normalizeSearchTerm(pName).includes(term));
  });
}
