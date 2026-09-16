import { supabase } from '@/pages/utils/supabaseConfig';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { getSettings } from '@/pages/utils/settingsService';
import { VariationRow } from '../types';

export const fetchPaginatedCatalog = async (page: number, limit: number): Promise<{ rows: VariationRow[], totalCount: number, apiError: string | null }> => {
    try {
        const settings = getSettings();
        let apiError = null;
        if (!settings.whatsappConfig?.accessToken || !settings.whatsappConfig?.catalogId) {
            apiError = "Configurações do WhatsApp incompletas. Vá em Configurações > WhatsApp para ajustar.";
        }

        const start = page * limit;
        const end = start + limit - 1;

        const COLUMNS = "id, code, description, brand, category, unit_price, stock, active, deleted_at, images, variations, environment, product_type_name, last_whatsapp_sync, line";
        
        let { data: productsData, error: pError, count } = await supabase
            .from('products')
            .select(COLUMNS, { count: 'exact' })
            .is('deleted_at', null)
            .order('description')
            .range(start, end);

        if (pError) {
            console.warn("[Catalog] Select específico falhou, tentando fallback '*'...", pError.message);
            const res = await supabase.from('products').select('*', { count: 'exact' }).is('deleted_at', null).order('description').range(start, end);
            productsData = res.data;
            pError = res.error;
            count = res.count;
        }

        if (pError) throw pError;

        // Busca status real na Meta para reconciliação
        let metaSkus = new Set<string>();
        try {
            const metaCatalog = await whatsappGraphService.fetchCatalogProducts();
            metaSkus = new Set(metaCatalog.map(p => p.retailer_id));
        } catch (err) {
            console.warn("Não foi possível buscar catálogo da Meta para reconciliação:", err);
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
                    const cleanVarName = rawVarName
                        .replace(new RegExp(`^${pDesc}\\s*[:\\-\\/\\s]*`, 'i'), '')
                        .trim() || rawVarName;

                    expanded.push({
                        varId: String(v.id || `${p.id}_${v.name}`),
                        varName: cleanVarName,
                        varSku: v.sku || v.code || '',
                        varStock: Number(v.stock ?? 0),
                        varPrice: Number(v.price ?? v.unitPrice ?? v.unit_price ?? v.priceOverride ?? v.salePrice ?? p.unit_price ?? 0),
                        varActive: v.active ?? true,
                        varImage: (v.images && v.images[0]) || (p.images && p.images[0]) || null,
                        varWhatsappSync: v.whatsappSync ?? false,
                        varWhatsappAutoSync: v.whatsappAutoSync ?? false,
                        varLastSync: v.lastWhatsappSync ?? null,
                        isActuallyOnMeta: metaSkus.has(v.sku || v.code || String(v.id || `${p.id}_${v.name}`)),
                        parentId: String(p.id),
                        parentDescription: p.description || '',
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

        return { rows: expanded, totalCount: count || 0, apiError };
    } catch (error: any) {
        throw new Error(error.message || "Erro desconhecido ao buscar catálogo");
    }
};

export const persistVariationSync = async (row: VariationRow, field: 'whatsappSync' | 'whatsappAutoSync', newValue: boolean) => {
    try {
        const { data: pai, error } = await supabase.from('products').select('variations').eq('id', row.parentId).single();
        
        if (error || !pai) {
            console.error("[Catalog] Erro ao buscar produto pai no persist:", error);
            throw new Error("Não foi possível carregar as variações para salvar. Tente novamente.");
        }

        let variacoes: any[] = [];
        if (Array.isArray(pai.variations)) {
            variacoes = pai.variations;
        } else if (typeof pai.variations === 'string') {
            try { variacoes = JSON.parse(pai.variations); } catch { variacoes = []; }
        }

        if (variacoes.length === 0) {
            console.warn("[Catalog] Nenhuma variação encontrada no pai ao tentar salvar.");
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
    } catch (err: any) {
        console.error("[Catalog] Erro no persistVariationSync:", err);
        throw err;
    }
};
