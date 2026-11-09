import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type Product from '@/pages/types/product.type';
import { getProductCategoryRootNames } from '../../components/tabs/sections/productCategoryEnvironment';

export function useProductFormCategorySelection(
  formData: Partial<Product>,
  availableCategories: any[],
  setFormData: Dispatch<SetStateAction<Partial<Product>>>
) {
  const selectedCategoryName = availableCategories
    .filter((category) => formData.categoryIds?.includes(category.id))
    .map((category) => category.name)
    .filter(Boolean)
    .join(' / ');

  const handleCategorySelect = useCallback(
    (cid: string) => {
      const isSelected = formData.categoryIds?.includes(cid);
      const newIds = isSelected
        ? formData.categoryIds?.filter((id) => id !== cid)
        : [...(formData.categoryIds || []), cid];
      const categoryIds = newIds || [];
      const availableEnvironments = getProductCategoryRootNames(categoryIds, availableCategories);
      setFormData((prev) => ({
        ...prev,
        categoryIds,
        environment:
          prev.environment && availableEnvironments.includes(prev.environment)
            ? prev.environment
            : availableEnvironments[0] || '',
        availableEnvironments,
      }));
    },
    [formData.categoryIds, formData.environment, availableCategories]
  );

  return { selectedCategoryName, handleCategorySelect };
}
