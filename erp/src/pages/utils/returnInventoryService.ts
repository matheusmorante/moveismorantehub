import Order from "../types/order.type";
import { saveInventoryMove } from "./inventoryService";
import { formatOrderCode } from "./orderCode";
import { supabase } from "./supabaseConfig";
import { reprocessMovingAverageCosts } from './movingAverageCostService';
import { canProcessReturnStock, getReturnInventoryDate, getReturnUnitCost, shouldCreateReturnEntry } from './returnInventoryRules';

const entryLabel = (order: Order, itemIndex: number) =>
    `Entrada por devolução atendida #${formatOrderCode(order)} - Item ${itemIndex + 1}`;

const hasReturnEntry = async (orderId: string, label: string) => {
    const { count, error } = await supabase
        .from("inventory_moves")
        .select("id", { count: "exact", head: true })
        .eq("order_id", orderId)
        .eq("type", "entry")
        .eq("reason", label);

    if (error) throw error;
    return (count || 0) > 0;
};

export const processReturnInventoryEntries = async (
    orderId: string,
    order: Order,
    options: { historical?: boolean } = {},
): Promise<boolean> => {
    if (!canProcessReturnStock(order)) return false;

    let processedAnyItem = false;

    for (const [itemIndex, item] of (order.items || []).entries()) {
        const label = entryLabel(order, itemIndex);
        if (!shouldCreateReturnEntry(item, await hasReturnEntry(orderId, label))) continue;

        await saveInventoryMove({
            productId: item.productId,
            variationId: item.variationId,
            productDescription: item.description,
            type: "entry",
            quantity: Number(item.quantity || 0),
            date: getReturnInventoryDate(order, Boolean(options.historical)),
            label,
            relatedEntityId: orderId,
            relatedEntityType: "sales_order",
            observation: JSON.stringify({
                note: `Gerado por devolução atendida do pedido de devolução #${formatOrderCode(order)}.`,
                linkedSaleOrderId: order.linkedOrderId || null,
            }),
            unitCost: getReturnUnitCost(item),
            unitPrice: item.unitPrice,
            status: "effective",
        }, 0);

        if (options.historical) {
            await reprocessMovingAverageCosts(item.productId, item.variationId);
        }

        processedAnyItem = true;
    }

    return processedAnyItem;
};
