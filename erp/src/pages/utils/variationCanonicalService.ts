import { supabase } from './supabaseConfig';

/** Resolve IDs históricos para a variação canônica usando a regra central do banco. */
export async function resolveCanonicalVariationIds(variationIds: Array<string | null | undefined>) {
    const uniqueIds = Array.from(new Set(variationIds.filter((id): id is string => Boolean(id))));
    const results = await Promise.all(uniqueIds.map(async variationId => {
        const { data, error } = await supabase.rpc('resolve_canonical_variation_id', {
            p_variation_id: variationId,
        });
        if (error) throw error;
        return [variationId, String(data || variationId)] as const;
    }));

    return new Map(results);
}

/** Dados atuais da variação canônica para a apresentação de agregações. */
export async function getCanonicalVariationNames(canonicalVariationIds: Iterable<string>) {
    const ids = Array.from(new Set(Array.from(canonicalVariationIds).filter(Boolean)));
    if (!ids.length) return new Map<string, string>();

    const { data, error } = await supabase
        .from('product_variations')
        .select('id, name')
        .in('id', ids);
    if (error) throw error;

    return new Map((data || []).map((variation: any) => [String(variation.id), variation.name || String(variation.id)]));
}

/**
 * Normaliza fatos para leitura consolidada. A variação histórica não é alterada
 * no documento: somente a chave usada para agrupar o relatório é canônica.
 */
export async function resolveCanonicalVariationReportItems<T extends { variationId?: string; product: string }>(items: T[]): Promise<T[]> {
    const canonicalIds = await resolveCanonicalVariationIds(items.map(item => item.variationId));
    const canonicalNames = await getCanonicalVariationNames(canonicalIds.values());

    return items.map(item => {
        const canonicalVariationId = item.variationId ? canonicalIds.get(item.variationId) : undefined;
        return canonicalVariationId
            ? { ...item, variationId: canonicalVariationId, product: canonicalNames.get(canonicalVariationId) || item.product }
            : item;
    });
}
