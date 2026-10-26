import type Product from '../../../types/product.type';

export interface ProductListFilters {
  readonly activeOnly?: boolean;
  readonly category?: string;
  readonly excludeItemType?: 'product' | 'composition' | 'service';
  readonly includeDeactivated?: boolean;
  readonly includeMergedVariations?: boolean;
  readonly isDraft?: boolean;
  readonly itemType?: 'product' | 'composition' | 'service';
  readonly search?: string;
  readonly showTestProducts?: boolean;
  readonly showTrash?: boolean;
  readonly sortBy?: 'description' | 'unitPrice' | 'stock' | 'code' | 'createdAt' | 'category';
  readonly sortOrder?: 'asc' | 'desc';
  readonly status?: 'published' | 'hidden';
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
  readonly isMerged?: boolean;
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
