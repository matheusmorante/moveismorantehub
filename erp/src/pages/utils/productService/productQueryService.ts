import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from '../../types/product.type';
import { mapFromDB } from './productMapper';
import { getLocalProducts, saveLocalProducts } from './productLocalCache';
import { TABLE_NAME } from './productSkuService';
import { applyProductFiltersAndSort, ProductQueryFilterOptions } from './productFilterBuilder';
import { searchHistoricalItems, getProductSalesStats } from './productAnalyticsQueryService';

export { searchHistoricalItems, getProductSalesStats };

export const LIGHT_COLUMNS = "id, code, description, brand, category, condition, opportunity_id, width, height, depth, unit_price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, initial_stock, stock, min_stock, unit, active, is_draft, deleted, supplier_id, supplier_ids, images, has_variations, item_type, created_at, updated_at";
export const LIGHT_COLUMNS_WITH_CATS = LIGHT_COLUMNS + ", product_categories(category_id), product_variations(*), product_images(*)";

// Helper to initialize products from Supabase
export const initializeProductsIfEmpty = async (): Promise<Product[]> => {
    try {
        console.log("[ProductService] Carregando produtos a partir da tabela do Supabase do e-commerce...");
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("[ProductService] Erro ao buscar produtos do Supabase:", error);
            return getLocalProducts();
        }

        let fetchedProducts: Product[] = (data || []).map((p, idx) => mapFromDB(p, idx));
        saveLocalProducts(fetchedProducts);
        return fetchedProducts;
    } catch (e) {
        console.error("[ProductService] Exceção ao sincronizar dados do Supabase:", e);
        return getLocalProducts();
    }
};

export const fetchProductsPage = async (
    page: number,
    pageSize: number,
    options?: ProductQueryFilterOptions
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

        const baseQuery = supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_images(*), product_categories(*, categories(*))', { count: 'exact' });

        const { data, error, count } = await applyProductFiltersAndSort(baseQuery, options, {
            orderColumn,
            ascending,
            from,
            to,
        });

        if (error) {
            console.error('[ProductService] Erro na paginação do BD:', error);
            return { data: [], total: 0 };
        }

        const mapped: Product[] = (data || []).map((p, idx) => mapFromDB(p, idx));
        const filteredBySupplier = options?.supplierId
            ? mapped.filter((product) => {
                const supplierIds = product.supplierIds || [];
                return supplierIds.includes(options.supplierId!) || product.mainSupplierId === options.supplierId || product.supplierId === options.supplierId;
            })
            : mapped;
        return { data: filteredBySupplier, total: options?.supplierId ? filteredBySupplier.length : (count ?? 0) };
    } catch (e) {
        console.error('[ProductService] Exceção em fetchProductsPage:', e);
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
                const idx = localProducts.findIndex(p => String(p.id) === String(id));
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
        console.error("[ProductService] Erro ao buscar produto detalhado do Supabase:", e);
    }

    const products = getLocalProducts();
    const product = products.find(p => String(p.id) === String(id));
    return product || null;
};

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
    const products = getLocalProducts();
    const idStrings = ids.map(String);
    return products.filter(p => idStrings.includes(String(p.id)));
};

export const getProductByCode = async (code: string): Promise<{ product: Product, variation?: Variation } | null> => {
    try {
        const products = getLocalProducts().filter(p => !p.deleted);

        const directMatch = products.find(p => p.code === code);
        if (directMatch) {
            return { product: directMatch };
        }

        for (const p of products) {
            const variation = p.variations?.find(v => v.sku === code);
            if (variation) {
                return { product: p, variation };
            }
        }

        return null;
    } catch (error) {
        console.error("Erro ao buscar produto por código:", error);
        return null;
    }
};
