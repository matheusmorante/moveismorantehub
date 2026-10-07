import type Product from '../../../types/product.type';

export interface ProductListFilters {
  readonly activeOnly?: boolean;
  readonly category?: string;
  readonly excludeItemType?: string;
  readonly includeDeactivated?: boolean;
  readonly includeMergedVariations?: boolean;
  readonly isDraft?: boolean;
  readonly itemType?: string;
  readonly search?: string;
  readonly showTestProducts?: boolean;
  readonly showTrash?: boolean;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly status?: string;
}

export interface ProductCategoryTree {
  readonly categories: Array<{ readonly id: string | number; readonly name: string }>;
  readonly relations: unknown[];
}

export interface ProductListVariationAttribute {
  readonly name?: string;
  readonly value?: string;
  readonly showName?: boolean;
}

export interface ProductListRow extends Product {
  readonly id: string;
  readonly rowId?: string;
  readonly variationId?: string;
  readonly mergedToVariationId?: string;
  readonly productId?: string;
  readonly displayName?: string;
  readonly attributes?: readonly ProductListVariationAttribute[];
  readonly syncUnitPrice?: boolean;
  readonly syncPromoPrice?: boolean;
  readonly syncDescription?: boolean;
  readonly syncWidth?: boolean;
  readonly syncHeight?: boolean;
  readonly syncDepth?: boolean;
  readonly syncWeight?: boolean;
  readonly parentImages?: string[];
  readonly isVariation?: boolean;
  readonly parentId?: string;
  readonly isParent?: boolean;
  readonly allVariations?: readonly ProductListRow[];
  readonly activeVariationsCount?: number;
  readonly totalVariationsCount?: number;
}
