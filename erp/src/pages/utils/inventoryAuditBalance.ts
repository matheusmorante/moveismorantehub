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
        return Number.isFinite(Number(target)) ? Number(target) : null;
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
        supabase.from("inventory_moves").select("*").eq("product_id", productId).order("date", { ascending: true }).order("created_at", { ascending: true }),
    ]);
    if (error) throw error;
    if (!productRow) return false;

    const moves = (rawMoves || []).filter(isEffective);
    const product = mapProductFromDB(productRow);
    const updatedVariations = [...(product.variations || [])];
    let hasAnchor = false;

    updatedVariations.forEach((variation: any, index: number) => {
        const variationMoves = moves.filter(move => String(move.variation_id || "") === String(variation.id));
        const anchor = [...variationMoves].reverse().find(move => getTargetStock(move) !== null);
        if (!anchor) return;
        hasAnchor = true;
        let stock = getTargetStock(anchor)!;
        for (const move of variationMoves.slice(variationMoves.indexOf(anchor) + 1)) stock += movementDelta(move);
        updatedVariations[index] = { ...variation, stock };
    });

    const lastAnchor = [...moves].reverse().find(move => getTargetStock(move) !== null && !move.variation_id);
    if (!hasAnchor && !lastAnchor) return false;

    let stock = Number(product.stock || 0);
    if (lastAnchor) {
        stock = getTargetStock(lastAnchor)!;
        for (const move of moves.slice(moves.indexOf(lastAnchor) + 1)) stock += movementDelta(move);
    } else {
        stock = updatedVariations.reduce((total: number, variation: any) => total + Number(variation.stock || 0), 0);
    }

    await updateProduct(productId, {
        stock,
        variations: updatedVariations.length ? updatedVariations : undefined,
    });
    return true;
};
