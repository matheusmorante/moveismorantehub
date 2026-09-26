import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { mapFromDB as mapProductFromDB, updateProduct } from '@/pages/utils/productService';
import { isEntryType, isExitType, isAdjustmentType } from './inventoryTypeRules';

export const recalculateProductStockOnMove = async (move: InventoryMove): Promise<void> => {
    const { data: p } = await supabase
        .from('products')
        .select('*, product_variations(*)')
        .eq('id', move.productId)
        .single();

    if (!p) return;

    const product = mapProductFromDB(p);
    let newTotalStock = Number(product.stock || 0);
    let newAverageCost = Number(product.costPrice || 0);
    const updatedVariations = product.variations ? [...product.variations] : [];

    const qty = Number(move.quantity || 0);

    if (move.variationId && updatedVariations.length > 0) {
        const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
        if (vIdx !== -1) {
            let vStock = Number(updatedVariations[vIdx].stock || 0);
            const previousStock = vStock;
            if (isEntryType(move.type)) vStock += qty;
            else if (isExitType(move.type)) vStock -= qty;
            else if (isAdjustmentType(move.type)) vStock += qty;

            if (isEntryType(move.type) && move.unitCost !== undefined && vStock > 0) {
                const previousCost = Number(updatedVariations[vIdx].costPrice || 0);
                updatedVariations[vIdx].costPrice = previousStock <= 0
                    ? move.unitCost
                    : previousCost > 0
                        ? ((previousStock * previousCost) + (qty * move.unitCost)) / vStock
                        : 0;
            }
            updatedVariations[vIdx].stock = vStock;
        }
        newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        const totalValue = updatedVariations.reduce(
            (acc: number, v: any) => acc + Number(v.stock || 0) * Number(v.costPrice || 0),
            0
        );
        newAverageCost = newTotalStock > 0 ? totalValue / newTotalStock : 0;
    } else {
        const previousStock = newTotalStock;
        if (isEntryType(move.type)) newTotalStock += qty;
        else if (isExitType(move.type)) newTotalStock -= qty;
        else if (isAdjustmentType(move.type)) newTotalStock += qty;

        if (isEntryType(move.type) && move.unitCost !== undefined && newTotalStock > 0) {
            newAverageCost = previousStock <= 0
                ? move.unitCost
                : newAverageCost > 0
                    ? ((previousStock * newAverageCost) + (qty * move.unitCost)) / newTotalStock
                    : 0;
        }
    }

    await updateProduct(move.productId, {
        stock: newTotalStock,
        costPrice: newAverageCost,
        variations: updatedVariations.length > 0 ? updatedVariations : undefined,
    });
};

export const revertProductStockFromMove = async (move: InventoryMove): Promise<void> => {
    const { data: p } = await supabase
        .from('products')
        .select('*, product_variations(*)')
        .eq('id', move.productId)
        .single();

    if (!p) return;

    const qty = Number(move.quantity || 0);
    const product = mapProductFromDB(p);
    let newTotalStock = Number(product.stock || 0);
    const updatedVariations = product.variations ? [...product.variations] : [];

    if (move.variationId && updatedVariations.length > 0) {
        const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
        if (vIdx !== -1) {
            let vStock = Number(updatedVariations[vIdx].stock || 0);
            if (isEntryType(move.type)) vStock -= qty;
            else if (isExitType(move.type)) vStock += qty;
            else if (isAdjustmentType(move.type)) vStock -= qty;
            updatedVariations[vIdx].stock = vStock;
        }
        newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
    } else {
        if (isEntryType(move.type)) newTotalStock -= qty;
        else if (isExitType(move.type)) newTotalStock += qty;
        else if (isAdjustmentType(move.type)) newTotalStock -= qty;
    }

    await updateProduct(move.productId, {
        stock: newTotalStock,
        variations: updatedVariations.length > 0 ? updatedVariations : undefined,
    });
};

export const reapplyProductStockFromMove = async (move: InventoryMove): Promise<void> => {
    const { data: p } = await supabase
        .from('products')
        .select('*, product_variations(*)')
        .eq('id', move.productId)
        .single();

    if (!p) return;

    const qty = Number(move.quantity || 0);
    const product = mapProductFromDB(p);
    let newTotalStock = Number(product.stock || 0);
    const updatedVariations = product.variations ? [...product.variations] : [];

    if (move.variationId && updatedVariations.length > 0) {
        const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
        if (vIdx !== -1) {
            let vStock = Number(updatedVariations[vIdx].stock || 0);
            if (isEntryType(move.type)) vStock += qty;
            else if (isExitType(move.type)) vStock -= qty;
            else if (isAdjustmentType(move.type)) vStock += qty;
            updatedVariations[vIdx].stock = vStock;
        }
        newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
    } else {
        if (isEntryType(move.type)) newTotalStock += qty;
        else if (isExitType(move.type)) newTotalStock -= qty;
        else if (isAdjustmentType(move.type)) newTotalStock += qty;
    }

    await updateProduct(move.productId, {
        stock: newTotalStock,
        variations: updatedVariations.length > 0 ? updatedVariations : undefined,
    });
};
