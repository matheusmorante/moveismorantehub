export const PRODUCT_CATEGORY_REQUIRED_MESSAGE = 'Selecione pelo menos uma categoria.';

export const hasRequiredProductCategory = (
  categoryIds?: readonly unknown[] | null,
  legacyCategoryId?: unknown
): boolean => Boolean(categoryIds?.length || legacyCategoryId);
