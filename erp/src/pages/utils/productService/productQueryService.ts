import { supabase } from '@/pages/utils/supabaseConfig';
import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';
import { getProductSalesStats, searchHistoricalItems } from './productAnalyticsQueryService';
import { applyProductFiltersAndSort, type ProductQueryFilterOptions } from './productFilterBuilder';
import { getLocalProducts, saveLocalProducts } from './productLocalCache';
import { mapFromDB } from './productMapper';
import { TABLE_NAME } from './productSkuService';

export { getProductSalesStats, searchHistoricalItems };

export const LIGHT_COLUMNS =
  'id, name, marketplace_title, code, description, observations, brand, category_id, category, condition, product_kind, is_salvado, opportunity_id, width, height, depth, unit_price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, promo_price, initial_stock, stock, min_stock, unit, active, is_draft, status, deleted, supplier_id, main_supplier_id, supplier_ids, images, has_variations, item_type, created_at, updated_at, slug, featured, is_combo, combo_items, technical_specs';
export const LIGHT_COLUMNS_WITH_CATS =
  LIGHT_COLUMNS +
  ', product_categories(*, categories(*)), product_variations(*), product_images(*), category_details:categories!products_category_id_fkey(id, name)';

// Helper to initialize products from Supabase
export const initializeProductsIfEmpty = async (): Promise<Product[]> => {
  try {
    console.log(
      '[ProductService] Carregando produtos a partir da tabela do Supabase do e-commerce...'
    );
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(LIGHT_COLUMNS_WITH_CATS)
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error('[ProductService] Erro ao buscar produtos do Supabase:', error);
        return getLocalProducts();
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) fetchMore = false;
      } else {
        fetchMore = false;
      }
    }

    const fetchedProducts: Product[] = allData.map((p, idx) => mapFromDB(p, idx));
    saveLocalProducts(fetchedProducts);
    return fetchedProducts;
  } catch (e) {
    console.error('[ProductService] Exceção ao sincronizar dados do Supabase:', e);
    return getLocalProducts();
  }
};

export const fetchProductsPage = async (
  page: number,
  pageSize: number,
  options?: ProductQueryFilterOptions,
  requestOptions: { throwOnError?: boolean } = {}
): Promise<{ data: Product[]; total: number }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    const ascending = sortOrder === 'asc';

    const columnMap: Record<string, string> = {
      description: 'description',
      unitPrice: 'unit_price',
      stock: 'stock',
      code: 'code',
      createdAt: 'created_at',
      category: 'category',
    };
    const orderColumn = columnMap[sortBy] || 'created_at';

    const baseQuery = supabase.from(TABLE_NAME).select(LIGHT_COLUMNS_WITH_CATS, { count: 'exact' });

    const { data, error, count } = await applyProductFiltersAndSort(baseQuery, options, {
      orderColumn,
      ascending,
      from,
      to,
    });

    if (error) {
      console.error('[ProductService] Erro na paginação do BD:', error);
      if (requestOptions.throwOnError) throw error;
      return { data: [], total: 0 };
    }

    const productUuids = (data || [])
      .map((p: any) => p.id)
      .filter((id: any) =>
        Boolean(
          id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))
        )
      );

    const eligibilityMap = new Map<
      string,
      { can_trash: boolean; trash_block_reason: string | null }
    >();

    if (productUuids.length > 0) {
      try {
        const { data: eligibilityData, error: eligibilityError } = await supabase.rpc(
          'get_products_trash_eligibility',
          { p_product_ids: productUuids }
        );

        if (!eligibilityError && Array.isArray(eligibilityData)) {
          eligibilityData.forEach((item: any) => {
            if (item.product_id) {
              eligibilityMap.set(String(item.product_id), {
                can_trash: Boolean(item.can_trash),
                trash_block_reason: item.trash_block_reason || null,
              });
            }
          });
        }
      } catch (err) {
        console.warn('[ProductService] Falha ao verificar elegibilidade de lixeira em lote:', err);
      }
    }

    const mapped: Product[] = (data || []).map((p: any, idx: number) => {
      const product = mapFromDB(p, idx);
      const eligibility = product.id ? eligibilityMap.get(product.id) : undefined;
      if (eligibility) {
        product.can_trash = eligibility.can_trash;
        product.trash_block_reason = eligibility.trash_block_reason;
      } else {
        product.can_trash = false;
        product.trash_block_reason = product.isDraft
          ? 'Rascunhos devem ser descartados diretamente'
          : 'Validando elegibilidade...';
      }
      return product;
    });

    return {
      data: mapped,
      total: count ?? 0,
    };
  } catch (e) {
    console.error('[ProductService] Exceção em fetchProductsPage:', e);
    if (requestOptions.throwOnError) throw e;
    return { data: [], total: 0 };
  }
};

export const getFullProduct = async (id: string): Promise<Product | null> => {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const mapped = mapFromDB(data);
        const localProducts = getLocalProducts();
        const idx = localProducts.findIndex((p) => String(p.id) === String(id));
        if (idx !== -1) {
          localProducts[idx] = mapped;
        } else {
          localProducts.push(mapped);
        }
        saveLocalProducts(localProducts);
        return mapped;
      }
    }
  } catch (e) {
    console.error('[ProductService] Erro ao buscar produto detalhado do Supabase:', e);
  }

  const products = getLocalProducts();
  const product = products.find((p) => String(p.id) === String(id));
  return product || null;
};

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  const products = getLocalProducts();
  const idStrings = ids.map(String);
  return products.filter((p) => idStrings.includes(String(p.id)));
};

export const getProductByCode = async (
  code: string
): Promise<{ product: Product; variation?: Variation } | null> => {
  try {
    const products = getLocalProducts().filter((p) => !p.deleted);

    const directMatch = products.find((p) => p.code === code);
    if (directMatch) {
      return { product: directMatch };
    }

    for (const p of products) {
      const variation = p.variations?.find((v) => v.sku === code);
      if (variation) {
        return { product: p, variation };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar produto por código:', error);
    return null;
  }
};
