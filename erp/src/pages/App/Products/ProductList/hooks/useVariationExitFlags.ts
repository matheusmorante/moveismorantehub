import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

// ─── Cache em nível de módulo ───────────────────────────────────────────────
// Evita múltiplas queries simultâneas quando vários componentes montam
let cachedSet: Set<string> | null = null;
let pendingPromise: Promise<Set<string>> | null = null;

interface InventoryMoveRow {
    readonly variation_id?: string | null;
}

const fetchExitedVariationIds = async (): Promise<Set<string>> => {
    if (cachedSet) return cachedSet;

    if (!pendingPromise) {
        pendingPromise = (async () => {
            const { data, error } = await supabase
                .from('inventory_moves')
                .select('variation_id')
                .eq('type', 'withdrawal')
                .not('order_id', 'is', null)
                .not('variation_id', 'is', null);

            if (error || !data) {
                pendingPromise = null;
                return new Set<string>();
            }

            const ids = new Set<string>();
            (data as readonly InventoryMoveRow[]).forEach((row) => {
                if (row.variation_id) {
                    ids.add(String(row.variation_id));
                }
            });

            cachedSet = ids;
            pendingPromise = null;
            return ids;
        })();
    }

    return pendingPromise;
};

/** Invalida o cache — chamar após um novo lançamento de saída */
export const invalidateExitFlagsCache = (): void => {
    cachedSet = null;
    pendingPromise = null;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseVariationExitFlagsResult {
    readonly exitedVariationIds: ReadonlySet<string>;
    readonly loading: boolean;
}

/**
 * Retorna um Set com todos os `variation_id` que já tiveram pelo menos
 * uma saída de estoque vinculada a um pedido de venda.
 * Faz uma única query compartilhada entre todas as instâncias.
 */
export const useVariationExitFlags = (): UseVariationExitFlagsResult => {
    const [exitedVariationIds, setExitedVariationIds] = useState<ReadonlySet<string>>(
        cachedSet ?? new Set<string>()
    );
    const [loading, setLoading] = useState(!cachedSet);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        if (cachedSet) {
            setExitedVariationIds(cachedSet);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchExitedVariationIds().then((ids) => {
            if (isMounted.current) {
                setExitedVariationIds(ids);
                setLoading(false);
            }
        });

        return () => {
            isMounted.current = false;
        };
    }, []);

    return { exitedVariationIds, loading };
};
