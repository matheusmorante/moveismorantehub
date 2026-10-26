export interface SelectedCatalogRequest {
  itemTokens: string[];
  categoryId: string;
  search: string;
  brand: string;
  hidePrices: boolean;
  allProducts: boolean;
  excludedProductIds: string[];
}

export interface SelectedCatalogVariation {
  id: string;
  name: string;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  attributes: unknown;
  status: string | null;
  active: boolean | null;
}

export interface SelectedCatalogProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number;
  promo_price: number | null;
  brand: string | null;
  image_url: string | null;
  product_variations: SelectedCatalogVariation[];
}

export interface SelectedCatalogItemToken {
  productId: string;
  variationId?: string;
}

export interface SelectedCatalogResult {
  products: SelectedCatalogProduct[];
  itemTokens: SelectedCatalogItemToken[];
  categoryName: string;
  totalCount: number;
  page: number;
  pageSize: number;
}
