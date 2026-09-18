import { supabase } from '../../../../utils/supabaseConfig';

export interface ReconciliationProduct {
    id: string;
    code?: string;
    sku?: string;
    name: string;
    category?: string;
    main_supplier_id?: string;
    supplier_id?: string;
    supplier_ids?: string[];
    people?: {
        fullName: string;
        tradeName?: string;
    } | null;
}

export interface ReconciliationFilters {
    search?: string;
    categoryId?: string;
    supplierId?: string;
}

export const fetchProductsForReconciliation = async (
    page: number = 1,
    pageSize: number = 15,
    filters: ReconciliationFilters
): Promise<{ data: ReconciliationProduct[]; count: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('products')
        .select(`
            id, code, name, category, main_supplier_id, supplier_id, supplier_ids
        `, { count: 'exact' });

    // Apenas produtos e não serviços/variações independentes (se houver essa distinção nas regras)
    query = query.eq('item_type', 'product').eq('is_variation', false).eq('deleted', false);

    // Sempre mostra apenas produtos sem fornecedor
    query = query.is('main_supplier_id', null).is('supplier_id', null);

    if (filters.supplierId) {
        query = query.or(`main_supplier_id.eq.${filters.supplierId},supplier_id.eq.${filters.supplierId},supplier_ids.cs.{"${filters.supplierId}"}`);
    }

    if (filters.categoryId) {
        query = query.eq('category', filters.categoryId); // Assuming flat string or category_ids array, update as needed
    }

    if (filters.search) {
        // Aspas duplas ao redor do valor são necessárias no PostgREST para valores
        // com espaços, vírgulas ou outros separadores de sintaxe
        const safe = filters.search.replace(/"/g, '');
        const s = `%${safe}%`;
        query = query.or(`name.ilike."${s}",code.ilike."${s}"`);
    }

    query = query.order('name', { ascending: true }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw error;
    }

    const products = (data as any) || [];

    // Busca os fornecedores manualmente para contornar o erro de relacionamento
    const supplierIds = new Set<string>();
    products.forEach((p: any) => {
        if (p.main_supplier_id) supplierIds.add(p.main_supplier_id);
    });

    if (supplierIds.size > 0) {
        const { data: peopleData } = await supabase
            .from('people')
            .select('id, full_name, social_name, nickname')
            .in('id', Array.from(supplierIds));
        
        const peopleMap = new Map();
        if (peopleData) {
            peopleData.forEach((p: any) => {
                peopleMap.set(p.id, {
                    fullName: p.nickname || p.full_name || '',
                    tradeName: p.social_name || ''
                });
            });
        }

        products.forEach((p: any) => {
            if (p.main_supplier_id && peopleMap.has(p.main_supplier_id)) {
                p.people = peopleMap.get(p.main_supplier_id);
            }
        });
    }

    return { data: products, count: count || 0 };
};

export const applySupplierBatch = async (
    productIds: string[],
    targetSupplierId: string,
    replaceExisting: boolean
) => {
    // Atualização direta via Supabase JS em batches de 50
    // Evita dependência de RPC com tipos incorretos (text vs uuid)
    const BATCH_SIZE = 50;
    let updated = 0;
    let ignored = 0;

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);

        let query = supabase
            .from('products')
            .update({ main_supplier_id: targetSupplierId })
            .in('id', batch);

        // Se não deve substituir, aplica apenas nos que ainda não têm fornecedor
        if (!replaceExisting) {
            query = query.is('main_supplier_id', null);
        }

        const { error, count } = await query.select('id');

        if (error) throw error;

        const batchUpdated = count ?? batch.length;
        updated += batchUpdated;
        if (!replaceExisting) {
            ignored += batch.length - batchUpdated;
        }
    }

    return {
        success: true,
        processed: productIds.length,
        updated,
        ignored,
    };
};
