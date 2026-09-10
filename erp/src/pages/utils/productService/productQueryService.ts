import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from '../../types/product.type';
import { removeAccents, buildAccentInsensitiveRegex } from '../textUtils';
import { mapFromDB } from './productMapper';
import { getLocalProducts, saveLocalProducts } from './productLocalCache';
import { TABLE_NAME } from './productSkuService';

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
    options?: {
        showTrash?: boolean;
        search?: string;
        category?: string;
        activeOnly?: boolean;
        status?: string;
        isDraft?: boolean;
        includeDeactivated?: boolean;
        supplierId?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }
): Promise<{ data: Product[]; total: number }> => {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const sortBy = options?.sortBy || 'created_at';
        const sortOrder = options?.sortOrder || 'desc';
        const ascending = sortOrder === 'asc';

        // Mapear sortBy do frontend para a coluna real do BD
        const columnMap: Record<string, string> = {
            description: 'description',
            unitPrice: 'unit_price',
            stock: 'stock',
            code: 'code',
            createdAt: 'created_at',
            category: 'category',
        };
        const orderColumn = columnMap[sortBy] || 'created_at';

        let query = supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_images(*), product_categories(*, categories(*))', { count: 'exact' });

        query = query.eq('deleted', false);

        // Rascunhos agora aparecem na listagem normal por padrão
        if (options?.isDraft === true) {
            query = query.or('is_draft.eq.true,status.eq.draft');
        } else if (options?.isDraft === false) {
            query = query.not('is_draft', 'is', true).neq('status', 'draft');
        }

        if (options?.activeOnly === false) {
            query = query.eq('active', false);
        } else if (options?.activeOnly === true) {
            query = query.eq('active', true);
        } else if (options?.includeDeactivated === false) {
            // Rascunhos não são produtos desativados: permanecem acessíveis no
            // fluxo de cadastro, enquanto os desativados ficam ocultos.
            query = query.or('active.eq.true,is_draft.eq.true,status.eq.draft');
        }

        query = query
            .order(orderColumn, { ascending })
            .range(from, to);

        // Filtro de busca textual — busca EXCLUSIVAMENTE pelo nome do produto (name) na tabela de produtos e variações (insensível a acentos)
        if (options?.search) {
            const rawSearch = options.search.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');
            if (rawSearch.length > 0) {
                const unaccented = removeAccents(rawSearch);
                const searchTerms = Array.from(new Set([rawSearch, unaccented])).filter(Boolean);
                const regexPattern = `.*${buildAccentInsensitiveRegex(rawSearch)}.*`;

                // 1. Buscar variações pelo campo 'name' na tabela product_variations
                let variationParentIds: string[] = [];
                try {
                    const varOrList = [
                        `name.imatch.${regexPattern}`,
                        ...searchTerms.map(t => `name.ilike.%${t}%`)
                    ];
                    const { data: matchedVariations } = await supabase
                        .from('product_variations')
                        .select('product_id')
                        .or(varOrList.join(','))
                        .limit(100);

                    if (matchedVariations && matchedVariations.length > 0) {
                        variationParentIds = Array.from(new Set(
                            matchedVariations.map(v => v.product_id).filter(Boolean)
                        ));
                    }
                } catch (e) {
                    console.warn('[ProductService] Erro ao buscar em product_variations:', e);
                }

                // 2. Montar filtro or com o campo name dos produtos e os IDs de variações
                const orConditions: string[] = [];
                orConditions.push(`name.imatch.${regexPattern}`);
                searchTerms.forEach(t => {
                    orConditions.push(`name.ilike.%${t}%`);
                });

                if (variationParentIds.length > 0) {
                    variationParentIds.forEach(id => {
                        orConditions.push(`id.eq.${id}`);
                    });
                }

                query = query.or(orConditions.join(','));
            }
        }

        // Filtro de categoria
        if (options?.category && options.category !== 'Serviços' && options.category !== 'Produtos') {
            query = query.eq('category', options.category);
        } else if (options?.category === 'Serviços') {
            query = query.eq('item_type', 'service');
        } else if (options?.category === 'Produtos') {
            query = query.eq('item_type', 'product');
        }

        // Filtro por status do catálogo digital (ex: 'published', 'hidden')
        if (options?.status) {
            query = query.eq('status', options.status);
        }

        const { data, error, count } = await query;

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
                // Atualiza cache local
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

export const searchHistoricalItems = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];

    try {
        const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);

        const { data: salesData } = await supabase
            .from('orders')
            .select('order_data')
            .neq('order_data->>deleted', 'true')
            .order('created_at', { ascending: false })
            .limit(100);

        const { data: purchaseData } = await supabase
            .from('purchases')
            .select('items')
            .order('id', { ascending: false })
            .limit(100);

        const descriptions = new Set<string>();

        salesData?.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
        });

        purchaseData?.forEach((row: any) => {
            const items = row.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
        });

        return Array.from(descriptions).slice(0, 10);
    } catch (error) {
        console.error("Erro ao buscar histórico de itens:", error);
        return [];
    }
};

export const getProductSalesStats = async (productId: string, variationId?: string): Promise<{ avgMonthlySales: number }> => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        let query = supabase
            .from('orders')
            .select('order_data')
            .neq('order_data->>deleted', 'true')
            .gte('created_at', ninetyDaysAgo.toISOString());

        if (variationId) {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\", \\"variationId\\": \\"${variationId}\\"}]}"`);
        } else {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\"}]}"`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data) return { avgMonthlySales: 0 };

        let totalQty = 0;
        data.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                if (item.productId === productId && (!variationId || item.variationId === variationId)) {
                    totalQty += item.quantity || 0;
                }
            });
        });

        return { avgMonthlySales: Math.round(totalQty / 3) };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};
