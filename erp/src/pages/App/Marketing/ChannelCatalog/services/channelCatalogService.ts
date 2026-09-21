import { supabase } from '@/pages/utils/supabaseConfig';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { pluralizeProductType } from '@/pages/utils/pluralize';
import { VariationRow, CatalogCollectionItem, ChannelFilter } from '../types';

const CATALOG_COLUMNS = 'id, code, description, brand, category, unit_price, stock, active, deleted_at, images, variations, environment, product_type_name, last_whatsapp_sync, line';

export async function fetchLightweightCollections(): Promise<CatalogCollectionItem[]> {
    const { data, error } = await supabase
        .from('products')
        .select('environment, product_type_name')
        .is('deleted_at', null);

    if (error || !data) return [];

    const seen = new Set<string>();
    const cols: CatalogCollectionItem[] = [];

    data.forEach(p => {
        const env = (p.environment || '').trim();
        const type = (p.product_type_name || '').trim();

        if (env) {
            const key = `env__${env}`;
            if (!seen.has(key)) {
                seen.add(key);
                cols.push({ label: env.toUpperCase(), key });
            }
        }
        if (type) {
            const key = `type__${type}`;
            if (!seen.has(key)) {
                seen.add(key);
                cols.push({ label: pluralizeProductType(type).toUpperCase(), key });
            }
        }
    });

    return cols.sort((a, b) => a.label.localeCompare(b.label));
}

export interface FetchPaginatedOptions {
    page: number;
    itemsPerPage: number;
    search: string;
    filterChannel: ChannelFilter;
    filterCollection: string;
}

export interface FetchPaginatedResult {
    rows: VariationRow[];
    totalCount: number;
}

export async function fetchPaginatedChannelProducts(options: FetchPaginatedOptions): Promise<FetchPaginatedResult> {
    const { page, itemsPerPage, search, filterChannel, filterCollection } = options;

    let query = supabase.from('products').select(CATALOG_COLUMNS, { count: 'exact' }).is('deleted_at', null);

    if (filterCollection !== 'all') {
        if (filterCollection.startsWith('env__')) {
            query = query.eq('environment', filterCollection.replace('env__', ''));
        }
        if (filterCollection.startsWith('type__')) {
            query = query.eq('product_type_name', filterCollection.replace('type__', ''));
        }
    }

    if (search) {
        const searchLower = search.toLowerCase();
        query = query.or(`description.ilike.%${searchLower}%,code.ilike.%${searchLower}%`);
    }

    if (filterChannel === 'whatsapp') {
        query = query.contains('variations', '[{"whatsappSync": true}]');
    }

    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    query = query.order('description').range(from, to);

    const { data: productsData, count, error: pError } = await query;
    if (pError) throw pError;

    let metaSkus = new Set<string>();
    try {
        const metaCatalog = await whatsappGraphService.fetchCatalogProducts();
        metaSkus = new Set(metaCatalog.map(p => p.retailer_id));
    } catch (err) {
        console.warn('Não foi possível buscar catálogo da Meta para reconciliação:', err);
    }

    const expanded: VariationRow[] = [];
    for (const p of (productsData || [])) {
        let variations: any[] = [];
        if (Array.isArray(p.variations)) {
            variations = p.variations;
        } else if (typeof p.variations === 'string' && p.variations.trim().startsWith('[')) {
            try { variations = JSON.parse(p.variations); } catch { variations = []; }
        } else if (p.variations && typeof p.variations === 'object') {
            variations = Object.values(p.variations);
        }

        for (const v of variations) {
            if (v && typeof v === 'object' && !v.deleted) {
                const pDesc = p.description || '';
                const rawVarName = v.name || v.description || 'VARIAÇÃO';
                const cleanVarName = rawVarName.replace(new RegExp(`^${pDesc}\\s*[:\\-\\/\\s]*`, 'i'), '').trim() || rawVarName;
                const varSku = v.sku || v.code || '';

                const searchLower = search.toLowerCase();
                const matchesSearch = !search ||
                    cleanVarName.toLowerCase().includes(searchLower) ||
                    varSku.toLowerCase().includes(searchLower) ||
                    pDesc.toLowerCase().includes(searchLower);

                const matchesChannel = filterChannel === 'all' || (filterChannel === 'whatsapp' && v.whatsappSync);

                if (matchesSearch && matchesChannel) {
                    expanded.push({
                        varId: String(v.id || `${p.id}_${v.name}`),
                        varName: cleanVarName,
                        varSku,
                        varStock: Number(v.stock ?? 0),
                        varPrice: Number(v.price ?? v.unitPrice ?? v.unit_price ?? v.priceOverride ?? v.salePrice ?? p.unit_price ?? 0),
                        varActive: v.active ?? true,
                        varImage: (v.images && v.images[0]) || (p.images && p.images[0]) || null,
                        varWhatsappSync: v.whatsappSync ?? false,
                        varWhatsappAutoSync: v.whatsappAutoSync ?? false,
                        varLastSync: v.lastWhatsappSync ?? null,
                        isActuallyOnMeta: metaSkus.has(varSku || String(v.id || `${p.id}_${v.name}`)),
                        parentId: String(p.id),
                        parentDescription: pDesc,
                        parentEnvironment: p.environment || '',
                        parentTypeName: p.product_type_name || '',
                        parentLine: p.line || '',
                        parentCode: p.code || '',
                        rawParent: p,
                        rawVariation: v,
                    });
                }
            }
        }
    }

    return {
        rows: expanded,
        totalCount: count || 0,
    };
}

export async function persistVariationSync(row: VariationRow, field: 'whatsappSync' | 'whatsappAutoSync', newValue: boolean): Promise<void> {
    const { data: pai, error } = await supabase.from('products').select('variations').eq('id', row.parentId).single();

    if (error || !pai) {
        console.error('[Catalog] Erro ao buscar produto pai no persist:', error);
        throw new Error('Não foi possível carregar as variações para salvar. Tente novamente.');
    }

    let variacoes: any[] = [];
    if (Array.isArray(pai.variations)) {
        variacoes = pai.variations;
    } else if (typeof pai.variations === 'string') {
        try { variacoes = JSON.parse(pai.variations); } catch { variacoes = []; }
    }

    const updatedVars = variacoes.map((v: any) => {
        const isMatch = String(v.id) === row.varId ||
            String(`${row.parentId}_${v.name}`) === row.varId ||
            String(v.sku || '') === row.varSku;

        if (isMatch) {
            return { ...v, [field]: newValue };
        }
        return v;
    });

    const changed = updatedVars.some((v, i) => v[field] !== variacoes[i][field]);
    if (changed) {
        const { error: patchError } = await supabase
            .from('products')
            .update({ variations: updatedVars })
            .eq('id', row.parentId);

        if (patchError) throw patchError;
    }
}
