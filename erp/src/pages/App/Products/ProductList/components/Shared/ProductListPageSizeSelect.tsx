import React, { useState } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import {
  PRODUCT_LIST_PAGE_SIZES,
  productListPageSizeFormSchema,
  type ProductListPageSize,
} from '../../../../../../../../shared-utils/listingFormSchemas';

interface ProductListPageSizeSelectProps {
  readonly itemsPerPage: ProductListPageSize;
  readonly onChange: (itemsPerPage: ProductListPageSize) => void;
}

export const ProductListPageSizeSelect: React.FC<ProductListPageSizeSelectProps> = ({
  itemsPerPage,
  onChange,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const { validateValues } = useZodForm(productListPageSizeFormSchema, { itemsPerPage });

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.currentTarget.value;
    const values = await validateValues(
      { itemsPerPage: selectedValue },
      () => setValidationError('Selecione 10 ou 15 itens por página.')
    );

    if (!values) return;
    setValidationError(null);
    if (values.itemsPerPage !== itemsPerPage) onChange(values.itemsPerPage);
  };

  return (
    <>
      <select
        aria-label="Itens por página"
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? 'product-list-page-size-error' : undefined}
        value={itemsPerPage}
        onChange={handleChange}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:outline-none"
      >
        {PRODUCT_LIST_PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size} por página
          </option>
        ))}
      </select>
      {validationError && (
        <span id="product-list-page-size-error" role="alert" className="text-xs text-red-600">
          {validationError}
        </span>
      )}
    </>
  );
};

export default ProductListPageSizeSelect;
