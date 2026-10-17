export interface MetaCatalogColumnMappings {
  brand?: string;
  condition?: string;
  gender?: string;
  age_group?: string;
  [key: string]: string | undefined;
}

export interface MetaCatalogSettings {
  globalDescriptionPrefix?: string;
  columnMappings: MetaCatalogColumnMappings;
}

export interface RawCategory {
  name: string;
  type: string;
}

export interface RawProductCategoryRelation {
  categories: RawCategory | null;
}

export interface RawProductImage {
  image_url: string;
  is_main?: boolean | null;
}

export interface RawProductVariation {
  id: string;
  sku?: string | null;
  name?: string | null;
  price?: number | string | null;
  promo_price?: number | string | null;
  description?: string | null;
  image_url?: string | null;
  active?: boolean | null;
  status?: string | null;
  stock?: number | null;
  attributes?: any;
  use_parent_price?: boolean | null;
  use_parent_promo_price?: boolean | null;
  use_parent_description?: boolean | null;
}

export interface RawOpportunity {
  id: string;
  name?: string | null;
  observations?: string | null;
}

export interface RawCatalogProduct {
  id: string;
  code?: string | null;
  sku?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  price?: number | string | null;
  unit_price?: number | string | null;
  promo_price?: number | string | null;
  stock?: number | null;
  active?: boolean | null;
  status?: string | null;
  is_draft?: boolean | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  is_salvado?: boolean | null;
  product_kind?: string | null;
  material?: string | null;
  images?: string[] | null;
  product_images?: RawProductImage[] | null;
  product_variations?: RawProductVariation[] | null;
  variations?: any;
  product_categories?: RawProductCategoryRelation[] | null;
  opportunities?: RawOpportunity | RawOpportunity[] | null;
}

export interface MapProductsOptions {
  products: RawCatalogProduct[];
  settings: MetaCatalogSettings;
  origin: string;
}
