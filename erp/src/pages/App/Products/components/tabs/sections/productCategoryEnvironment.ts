import { getProductCategoryRootNames } from '../../../../../../../../shared-utils/productCategoryResolution';
import { searchProductCategories } from '../../../../../../../../shared-utils/productCategorySearch';

export { getProductCategoryRootNames, searchProductCategories };

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
