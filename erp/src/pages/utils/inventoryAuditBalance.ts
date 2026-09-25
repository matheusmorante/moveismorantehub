import { supabase } from "./supabaseConfig";
import { mapFromDB as mapProductFromDB, updateProduct } from "./productService";

const isEffective = (move: any) => {
    try {
        const meta = JSON.parse(move.observation || "{}");
        return !["reversed", "cancelled"].includes(move.status) && !["reversed", "cancelled"].includes(meta.status);
    } catch {
        return !["reversed", "cancelled"].includes(move.status);
    }
};

const getTargetStock = (move: any): number | null => {
    try {
        const target = JSON.parse(move.observation || "{}").targetStock;
        if (target === null || target === undefined || target === "") return null;
        return Number.isFinite(Number(target)) ? Number(target) : null;
    } catch {
        return null;
    }
};

const getPreviousStock = (move: any): number | null => {
    try {
        const previous = JSON.parse(move.observation || "{}").previousStock;
        if (previous === null || previous === undefined || previous === "") return null;
        return Number.isFinite(Number(previous)) ? Number(previous) : null;
    } catch {
        return null;
    }
};

const movementDelta = (move: any) => move.type === "entry" ? Number(move.quantity || 0)
    : move.type === "exit" ? -Number(move.quantity || 0) : 0;

/** Recalcula apenas produtos que possuem um ajuste de inventário com saldo de referência. */
export const recalculateInventoryAuditBalance = async (productId: string): Promise<boolean> => {
    const [{ data: productRow }, { data: rawMoves, error }] = await Promise.all([
        supabase.from("products").select("*, product_variations(*)").eq("id", productId).single(),
        supabase.from("inventory_moves").select("*").eq("product_id", productId).order("date", { ascending: true }).order("created_at", { ascending: true }).limit(500),
    ]);
    if (error) throw error;
    if (!productRow) return false;

    const allMoves = rawMoves || [];
    const moves = allMoves.filter(isEffective);
    const product = mapProductFromDB(productRow);
    const updatedVariations = [...(product.variations || [])];
    let hasAnchor = false;

    updatedVariations.forEach((variation: any, index: number) => {
        const variationMoves = moves.filter(move => String(move.variation_id || "") === String(variation.id));
        const anchor = [...variationMoves].reverse().find(move => getTargetStock(move) !== null);
        const reversedAnchor = anchor ? null : [...allMoves].reverse().find(move =>
            String(move.variation_id || "") === String(variation.id)
            && !isEffective(move)
            && getTargetStock(move) !== null
            && getPreviousStock(move) !== null
        );
        if (!anchor && !reversedAnchor) return;
        hasAnchor = true;
        let stock = anchor ? getTargetStock(anchor)! : getPreviousStock(reversedAnchor)!;
        const anchorIndex = allMoves.indexOf(anchor || reversedAnchor);
        for (const move of allMoves.slice(anchorIndex + 1)) {
            if (!isEffective(move) || String(move.variation_id || "") !== String(variation.id)) continue;
            stock += movementDelta(move);
        }
        updatedVariations[index] = { ...variation, stock };
    });

    const lastEffectiveAnchor = [...moves].reverse().find(move => getTargetStock(move) !== null && !move.variation_id);
    const lastReversedAnchor = lastEffectiveAnchor ? null : [...allMoves].reverse().find(move =>
        !move.variation_id && !isEffective(move) && getTargetStock(move) !== null && getPreviousStock(move) !== null
    );
    const lastAnchor = lastEffectiveAnchor || lastReversedAnchor;
    if (!hasAnchor && !lastAnchor) return false;

    let stock = Number(product.stock || 0);
    if (lastAnchor) {
        stock = lastEffectiveAnchor ? getTargetStock(lastAnchor)! : getPreviousStock(lastAnchor)!;
        const anchorIndex = allMoves.indexOf(lastAnchor);
        for (const move of allMoves.slice(anchorIndex + 1)) {
            if (!isEffective(move) || move.variation_id) continue;
            stock += movementDelta(move);
        }
    } else {
        stock = updatedVariations.reduce((total: number, variation: any) => total + Number(variation.stock || 0), 0);
    }

    await updateProduct(productId, {
        stock,
        variations: updatedVariations.length ? updatedVariations : undefined,
    });
    return true;
};
