import { supabase } from '../../../../utils/supabaseConfig';
import {
    ReconciliationProductItem,
    ReconciliationFilterState,
    ReconciliationSummary,
    RequiredCategoryAttribute
} from '../types/reconciliation.types';
import { detectProductPendencies, calculateReconciliationSummary } from './pendencyDetector';

/**
 * Busca todos os atributos que foram configurados como obrigatórios por categoria
 */
export async function fetchRequiredCategoryAttributes(): Promise<RequiredCategoryAttribute[]> {
    try {
        const { data, error } = await supabase
            .from('category_attributes')
            .select(`
                category_id,
                attribute_id,
                is_required,
                attributes (
                    id,
                    name,
                    data_type,
                    unit
                )
            `)
            .eq('is_required', true);

        if (error) {
            console.warn('[Reconciliation] Aviso ao buscar category_attributes:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            categoryId: row.category_id,
            attributeId: row.attribute_id,
            isRequired: Boolean(row.is_required),
            attribute: row.attributes ? {
                id: row.attributes.id,
                name: row.attributes.name,
                data_type: row.attributes.data_type || 'list',
                unit: row.attributes.unit || undefined
            } : undefined
        }));
    } catch (err) {
        console.error('[Reconciliation] Erro ao carregar atributos obrigatórios:', err);
        return [];
    }
}

/**
 * Consulta de produtos para conciliação com filtros dinâmicos e paginação.
 */
export async function fetchProductsForReconciliation(
    page: number = 1,
    pageSize: number = 15,
    filters: ReconciliationFilterState = {}
): Promise<{
    data: ReconciliationProductItem[];
    count: number;
    summary: ReconciliationSummary;
}> {
    const requiredCategoryAttrs = await fetchRequiredCategoryAttributes();

    let query = supabase
        .from('products')
        .select(`
            id,
            code,
            name,
            description,
            category,
            category_id,
            main_supplier_id,
            supplier_id,
            supplier_ids,
            price,
            fiscal,
            product_categories (
                category_id,
                categories ( id, name )
            ),
            product_variations (
                id,
                sku,
                name,
                price,
                use_parent_price,
                attributes,
                active,
                status
            )
        `, { count: 'exact' });

    query = query
        .eq('item_type', 'product')
        .eq('is_variation', false)
        .eq('deleted', false);

    // Filtros de nível SQL quando aplicáveis
    if (filters.supplierId) {
        query = query.or(
            `main_supplier_id.eq.${filters.supplierId},supplier_id.eq.${filters.supplierId},supplier_ids.cs.{"${filters.supplierId}"}`
        );
    }

    if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
    }

    if (filters.search) {
        const safe = filters.search.replace(/"/g, '').trim();
        if (safe) {
            const s = `%${safe}%`;
            query = query.or(`name.ilike."${s}",code.ilike."${s}"`);
        }
    }

    // Filtros específicos de pendência que podem ser acelerados no banco
    if (filters.pendencyType === 'supplier') {
        query = query.is('main_supplier_id', null).is('supplier_id', null);
    } else if (filters.pendencyType === 'category') {
        query = query.is('category_id', null);
    }

    // Ordenação alfabética padrão
    query = query.order('name', { ascending: true });

    // Se houver filtro específico de fornecedor/categoria que o banco já filtra 100%,
    // podemos usar a paginação direta no banco.
    // Para filtros mais abrangentes (que dependem de atributos de variações/NCM JSONB),
    // buscamos uma janela ampla ou processamos de forma eficiente.
    const from = (page - 1) * pageSize;
    const to = from + pageSize * 3 - 1; // Busca janela com folga para filtrar pendências

    query = query.range(from, to);

    const { data: rawData, error, count: rawCount } = await query;
    if (error) throw error;

    const rawProducts = (rawData as any[]) || [];

    // Carregar fornecedores associados
    const supplierIds = new Set<string>();
    rawProducts.forEach(p => {
        if (p.main_supplier_id) supplierIds.add(p.main_supplier_id);
        if (p.supplier_id) supplierIds.add(p.supplier_id);
    });

    const peopleMap = new Map<string, { fullName: string; tradeName?: string }>();
    if (supplierIds.size > 0) {
        const { data: peopleData } = await supabase
            .from('people')
            .select('id, full_name, social_name, nickname')
            .in('id', Array.from(supplierIds));

        if (peopleData) {
            peopleData.forEach((p: any) => {
                peopleMap.set(p.id, {
                    fullName: p.nickname || p.full_name || '',
                    tradeName: p.social_name || ''
                });
            });
        }
    }

    // Processar produtos e detectar pendências
    const processedProducts: ReconciliationProductItem[] = rawProducts.map(raw => {
        const effectiveSupplierId = raw.main_supplier_id || raw.supplier_id;
        const people = effectiveSupplierId ? peopleMap.get(effectiveSupplierId) : null;

        const categoryNames: string[] = (raw.product_categories || [])
            .map((pc: any) => pc.categories?.name)
            .filter(Boolean);

        const categoryIds: string[] = (raw.product_categories || [])
            .map((pc: any) => pc.category_id)
            .filter(Boolean);

        if (raw.category_id && !categoryIds.includes(raw.category_id)) {
            categoryIds.push(raw.category_id);
        }

        const variations = (raw.product_variations || []).map((v: any) => {
            let attrs = v.attributes;
            if (typeof attrs === 'string') {
                try { attrs = JSON.parse(attrs); } catch { attrs = []; }
            }
            if (!Array.isArray(attrs)) attrs = [];

            return {
                id: v.id,
                sku: v.sku || '',
                name: v.name || '',
                price: v.price ? Number(v.price) : undefined,
                useParentPrice: v.use_parent_price !== false,
                active: v.active !== false,
                attributes: attrs.map((a: any) => ({
                    name: a.name || a.attribute_name || a.key || '',
                    value: String(a.value || a.option || ''),
                    showName: a.showName ?? true
                }))
            };
        });

        const productBase = {
            id: raw.id,
            code: raw.code,
            sku: raw.sku || raw.code,
            name: raw.name || raw.description || '',
            category: raw.category || (categoryNames.length > 0 ? categoryNames.join(' | ') : ''),
            categoryId: raw.category_id,
            categoryIds,
            mainSupplierId: raw.main_supplier_id,
            supplierId: raw.supplier_id,
            supplierIds: raw.supplier_ids || [],
            people,
            price: raw.price ? Number(raw.price) : undefined,
            fiscal: raw.fiscal || {},
            variations
        };

        const {
            pendencies,
            variationsWithPendencies,
            hasParentPendencies,
            hasVariationPendencies
        } = detectProductPendencies(productBase, requiredCategoryAttrs);

        return {
            ...productBase,
            variations: variations.map(v => {
                const withP = variationsWithPendencies.find(vp => vp.id === v.id);
                return withP ? { ...v, pendencies: withP.pendencies } : v;
            }),
            pendencies,
            hasParentPendencies,
            hasVariationPendencies
        };
    });

    // Filtrar apenas produtos que de fato possuem pendências
    let pendingProducts = processedProducts.filter(p => p.pendencies.length > 0);

    // Se o filtro de pendência estiver selecionado, filtra por tipo específico
    if (filters.pendencyType && filters.pendencyType !== 'all') {
        const pType = filters.pendencyType;
        pendingProducts = pendingProducts.filter(p => {
            if (pType === 'attributes') {
                return p.pendencies.some(
                    pend => pend.type === 'category_attribute' || pend.type === 'incomplete_attribute'
                );
            }
            return p.pendencies.some(pend => pend.type === pType);
        });
    }

    if (filters.onlyCritical) {
        pendingProducts = pendingProducts.filter(p => p.pendencies.some(pend => pend.isCritical));
    }

    // Calcula o resumo sobre todos os produtos pendentes encontrados
    const summary = calculateReconciliationSummary(pendingProducts);

    // Aplica a fatia da página solicitada
    const paginatedProducts = pendingProducts.slice(0, pageSize);
    const totalCount = rawCount !== null ? Math.max(pendingProducts.length, rawCount) : pendingProducts.length;

    return {
        data: paginatedProducts,
        count: totalCount,
        summary
    };
}

/**
 * Atribui fornecedor em lote para os IDs selecionados
 */
export async function applySupplierBatch(
    productIds: string[],
    supplierId: string,
    replaceExisting: boolean = true
): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
        const BATCH_SIZE = 50;
        let updated = 0;

        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            const batch = productIds.slice(i, i + BATCH_SIZE);

            let q = supabase
                .from('products')
                .update({ main_supplier_id: supplierId, supplier_id: supplierId })
                .in('id', batch);

            if (!replaceExisting) {
                q = q.is('main_supplier_id', null);
            }

            const { error, count } = await q.select('id');
            if (error) throw error;
            updated += count ?? batch.length;
        }

        return { success: true, updated };
    } catch (err: any) {
        console.error('[Reconciliation] Erro ao aplicar fornecedor em lote:', err);
        return { success: false, updated: 0, error: err.message || 'Erro ao atualizar fornecedor.' };
    }
}

/**
 * Atribui categoria em lote para os IDs selecionados
 */
export async function applyCategoryBatch(
    productIds: string[],
    categoryId: string
): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
        // Atualiza a coluna category_id na tabela products
        const { error: prodErr } = await supabase
            .from('products')
            .update({ category_id: categoryId })
            .in('id', productIds);

        if (prodErr) throw prodErr;

        // Atualiza a tabela associativa product_categories
        await supabase
            .from('product_categories')
            .delete()
            .in('product_id', productIds);

        const categoryRecords = productIds.map(id => ({
            product_id: id,
            category_id: categoryId
        }));

        const { error: catErr } = await supabase
            .from('product_categories')
            .insert(categoryRecords);

        if (catErr) {
            console.warn('[Reconciliation] Aviso ao inserir product_categories:', catErr);
        }

        return { success: true, updated: productIds.length };
    } catch (err: any) {
        console.error('[Reconciliation] Erro ao aplicar categoria em lote:', err);
        return { success: false, updated: 0, error: err.message || 'Erro ao atualizar categoria.' };
    }
}

/**
 * Atribui NCM em lote para os IDs selecionados
 */
export async function applyNcmBatch(
    productIds: string[],
    ncm: string
): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
        const cleanNcm = ncm.trim();
        for (const id of productIds) {
            const { data: prod } = await supabase
                .from('products')
                .select('fiscal')
                .eq('id', id)
                .single();

            const existingFiscal = prod?.fiscal || {};
            const updatedFiscal = { ...existingFiscal, ncm: cleanNcm };

            await supabase
                .from('products')
                .update({ fiscal: updatedFiscal })
                .eq('id', id);
        }

        return { success: true, updated: productIds.length };
    } catch (err: any) {
        console.error('[Reconciliation] Erro ao aplicar NCM em lote:', err);
        return { success: false, updated: 0, error: err.message || 'Erro ao atualizar NCM.' };
    }
}

/**
 * Atribui atributo e valor em lote para as variações de produtos compatíveis
 */
export async function applyAttributeBatch(
    productIds: string[],
    attributeName: string,
    attributeValue: string
): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
        const cleanName = attributeName.trim();
        const cleanValue = attributeValue.trim();

        const { data: variations, error: varErr } = await supabase
            .from('product_variations')
            .select('id, product_id, attributes')
            .in('product_id', productIds);

        if (varErr) throw varErr;

        let updatedCount = 0;
        for (const v of variations || []) {
            let attrs: any[] = v.attributes;
            if (typeof attrs === 'string') {
                try { attrs = JSON.parse(attrs); } catch { attrs = []; }
            }
            if (!Array.isArray(attrs)) attrs = [];

            const existingIndex = attrs.findIndex(
                (a: any) => (a.name || '').toLowerCase() === cleanName.toLowerCase()
            );

            if (existingIndex >= 0) {
                attrs[existingIndex] = { ...attrs[existingIndex], value: cleanValue };
            } else {
                attrs.push({ name: cleanName, value: cleanValue, showName: true });
            }

            const { error: updErr } = await supabase
                .from('product_variations')
                .update({ attributes: attrs })
                .eq('id', v.id);

            if (!updErr) updatedCount++;
        }

        return { success: true, updated: updatedCount };
    } catch (err: any) {
        console.error('[Reconciliation] Erro ao aplicar atributo em lote:', err);
        return { success: false, updated: 0, error: err.message || 'Erro ao atualizar atributos.' };
    }
}

/**
 * Salva correções inline feitas diretamente em um produto e em suas variações
 */
export async function saveSingleProductReconciliation(
    productUpdates: {
        id: string;
        mainSupplierId?: string;
        categoryId?: string;
        ncm?: string;
        price?: number;
    },
    variationUpdates?: Array<{
        id: string;
        price?: number;
        attributes?: Array<{ name: string; value: string; showName?: boolean }>;
    }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const payload: Record<string, any> = {};

        if (productUpdates.mainSupplierId !== undefined) {
            payload.main_supplier_id = productUpdates.mainSupplierId;
            payload.supplier_id = productUpdates.mainSupplierId;
        }

        if (productUpdates.categoryId !== undefined) {
            payload.category_id = productUpdates.categoryId;
            // Atualizar tabela product_categories
            await supabase
                .from('product_categories')
                .delete()
                .eq('product_id', productUpdates.id);

            if (productUpdates.categoryId) {
                await supabase
                    .from('product_categories')
                    .insert([{ product_id: productUpdates.id, category_id: productUpdates.categoryId }]);
            }
        }

        if (productUpdates.price !== undefined && !isNaN(productUpdates.price)) {
            payload.price = productUpdates.price;
        }

        if (productUpdates.ncm !== undefined) {
            const { data: current } = await supabase
                .from('products')
                .select('fiscal')
                .eq('id', productUpdates.id)
                .single();

            const fiscal = { ...(current?.fiscal || {}), ncm: productUpdates.ncm.trim() };
            payload.fiscal = fiscal;
        }

        if (Object.keys(payload).length > 0) {
            const { error: pErr } = await supabase
                .from('products')
                .update(payload)
                .eq('id', productUpdates.id);

            if (pErr) throw pErr;
        }

        // Salvar variações caso tenham sido alteradas
        if (variationUpdates && variationUpdates.length > 0) {
            for (const v of variationUpdates) {
                const varPayload: Record<string, any> = {};
                if (v.price !== undefined) varPayload.price = v.price;
                if (v.attributes !== undefined) varPayload.attributes = v.attributes;

                if (Object.keys(varPayload).length > 0) {
                    const { error: vErr } = await supabase
                        .from('product_variations')
                        .update(varPayload)
                        .eq('id', v.id);

                    if (vErr) throw vErr;
                }
            }
        }

        return { success: true };
    } catch (err: any) {
        console.error('[Reconciliation] Erro ao salvar conciliação do produto:', err);
        return { success: false, error: err.message || 'Erro ao salvar alterações.' };
    }
}
