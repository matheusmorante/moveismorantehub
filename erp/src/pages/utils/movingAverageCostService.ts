import { supabase } from "./supabaseConfig";
import { CostState, replayMovingAverageMoves } from "./movingAverageCostRules";

/**
 * Reconstitui o saldo financeiro de um SKU a partir dos movimentos efetivos.
 * O custo fica no próprio movimento, preservando o CMV da venda no instante em
 * que ela ocorreu e sem precisar adicionar campos ao banco.
 */
export const getMovingAverageCost = async (productId: string, variationId?: string): Promise<CostState> => {
    let query = supabase
        .from("inventory_moves")
        .select("type, quantity, unit_cost, observation, date, created_at")
        .eq("product_id", productId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

    query = variationId ? query.eq("variation_id", variationId) : query.is("variation_id", null);
    const { data, error } = await query;
    if (error) throw error;

    return replayMovingAverageMoves((data || []).map((move: any) => ({
        ...move,
        unitCost: move.unit_cost,
    }))).state;
};

export const getCurrentMovingAverageUnitCost = async (productId: string, variationId?: string) => {
    const { data, error } = await supabase
        .from("products")
        .select("cost_price, product_variations(id, cost_price)")
        .eq("id", productId)
        .single();
    if (error) throw error;
    const variation = variationId
        ? (data?.product_variations || []).find((item: any) => String(item.id) === String(variationId))
        : undefined;
    const cachedCost = Number(variation?.cost_price ?? data?.cost_price);
    return Number.isFinite(cachedCost) && cachedCost > 0 ? cachedCost : undefined;
};

/** Recalcula somente o SKU afetado após a correção de um recebimento histórico. */
export const reprocessMovingAverageCosts = async (productId: string, variationId?: string) => {
    let query = supabase
        .from("inventory_moves")
        .select("id, type, quantity, unit_cost, observation, date, created_at")
        .eq("product_id", productId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
    query = variationId ? query.eq("variation_id", variationId) : query.is("variation_id", null);
    const { data, error } = await query;
    if (error) throw error;

    const replay = replayMovingAverageMoves((data || []).map((move: any) => ({
        ...move,
        unitCost: move.unit_cost,
    })), true);
    for (const move of replay.moves) {
        if ((move.type === "exit" || move.type === "withdrawal") && move.resolvedUnitCost !== undefined
            && Math.abs((Number(move.unitCost) || 0) - move.resolvedUnitCost) > 0.000001) {
            const { error: updateError } = await supabase
                .from("inventory_moves")
                .update({ unit_cost: move.resolvedUnitCost })
                .eq("id", move.id);
            if (updateError) throw updateError;
        }
    }

    const finalCost = replay.state.unitCost || 0;
    if (variationId) {
        const { error: variationError } = await supabase
            .from("product_variations")
            .update({ cost_price: finalCost })
            .eq("id", variationId);
        if (variationError) throw variationError;
    } else {
        const { updateProduct } = await import("./productService");
        await updateProduct(productId, { stock: replay.state.quantity, costPrice: finalCost });
    }
};
