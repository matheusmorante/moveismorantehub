import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value);

export const LIGHT_COLUMNS =
  'id, name, marketplace_title, code, description, observations, brand, category_id, category, condition, product_kind, is_salvado, opportunity_id, width, height, depth, unit_price, price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, promo_price, initial_stock, stock, min_stock, unit, active, is_draft, status, deleted, supplier_id, main_supplier_id, supplier_ids, images, has_variations, item_type, created_at, updated_at, slug, featured, is_combo, combo_items, technical_specs';

export const LIGHT_COLUMNS_WITH_CATS =
  LIGHT_COLUMNS +
  ', product_categories(id, category_id, categories(id, name, slug)), product_variations(*), product_images(image_url,is_main), category_details:categories!products_category_id_fkey(id, name)';

/**
 * Full single-product detail projection used when opening/hydrating an editable product.
 * Keeps `products` root columns complete for schema-evolving fields read by `mapFromDB`,
 * while narrowing joined category and image relations to the consumed fields.
 */
export const FULL_PRODUCT_COLUMNS =
  '*, product_variations(*), product_categories(id, category_id, categories(id, name, slug)), product_images(image_url, is_main)';

/** Minimal product and variation data needed to search and add items to a sale. */
export const SALES_ORDER_AUTOCOMPLETE_COLUMNS =
  'id,name,marketplace_title,code,description,unit,unit_price,price,promo_price,cost_price,stock,active,is_draft,status,deleted,supplier_id,main_supplier_id,supplier_ids,product_kind,condition,is_salvado,item_type,is_combo,fiscal,variation_details:technical_specs->variationDetails,product_variations(id,product_id,sku,name,stock,price,promo_price,cost_price,active,status,merged_to_variation_id,attributes,use_parent_name,use_parent_price,use_parent_promo_price,use_parent_dimensions,use_parent_description)';

export const PRODUCT_LINK_CONFIRMATION_COLUMNS =
  'id,deleted,code,name,marketplace_title,description,is_draft,status,item_type';

export const PRODUCT_LINK_CONFIRMATION_WITH_VARIATION_COLUMNS = [
  PRODUCT_LINK_CONFIRMATION_COLUMNS,
  'product_variations(id,product_id,sku,name,use_parent_name)',
].join(',');

export type ProductPreviewOption = {
  id: string;
  name: string;
  title?: string;
};

export type ProductPreviewRow = {
  id: unknown;
  name?: unknown;
  title?: unknown;
  description?: unknown;
};

export type ProductLinkConfirmation = Pick<
  Product,
  'id' | 'deleted' | 'code' | 'name' | 'title'
> & {
  variations?: Pick<Variation, 'id' | 'sku' | 'name' | 'title'>[];
};

export const toProductLinkConfirmation = (
  product: Product,
  variationId?: string
): ProductLinkConfirmation => ({
  id: product.id,
  deleted: product.deleted,
  code: product.code,
  name: product.name,
  title: product.title,
  variations: product.variations
    ?.filter((variation) => !variationId || variation.id === variationId)
    .map(({ id, sku, name, title }) => ({ id, sku, name, title })),
});

export const mapPreviewProductOptionRow = (row: ProductPreviewRow): ProductPreviewOption => ({
  id: String(row.id),
  name: String(
    row.name ||
      row.title ||
      String(row.description || '').split('\n')[0].substring(0, 120) ||
      ''
  ),
  ...(row.title ? { title: String(row.title) } : {}),
});
