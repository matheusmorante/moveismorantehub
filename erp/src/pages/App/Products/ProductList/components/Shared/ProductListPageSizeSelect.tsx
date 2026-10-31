import React from 'react';
import type { ProductListPageSize } from '../../../../../../../../shared-utils/listingFormSchemas';

interface ProductListPageSizeSelectProps {
  readonly itemsPerPage: ProductListPageSize;
}

export const ProductListPageSizeSelect: React.FC<ProductListPageSizeSelectProps> = ({ itemsPerPage }) => (
  <span className="text-xs font-semibold">{itemsPerPage} por página</span>
);

export default ProductListPageSizeSelect;
