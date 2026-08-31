import Order from "../types/order.type";
import { saveInventoryMove } from "./inventoryService";
import { formatOrderCode } from "./orderCode";
import { supabase } from "./supabaseConfig";

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

export const processReturnInventoryEntries = async (orderId: string, order: Order): Promise<boolean> => {
    if (order.orderType !== "return") return false;

    let processedAnyItem = false;

    for (const [itemIndex, item] of (order.items || []).entries()) {
        if (!item.productId || item.isTemporaryProduct) continue;

        const label = entryLabel(order, itemIndex);
        if (await hasReturnEntry(orderId, label)) continue;

        await saveInventoryMove({
            productId: item.productId,
            variationId: item.variationId,
            productDescription: item.description,
            type: "entry",
            quantity: Number(item.quantity || 0),
            date: new Date().toISOString(),
            label,
            relatedEntityId: orderId,
            relatedEntityType: "sales_order",
            observation: `Gerado por devolução atendida do pedido de devolução #${formatOrderCode(order)}.`,
            unitPrice: item.unitPrice,
            status: "effective",
        }, 0);

        processedAnyItem = true;
    }

    return processedAnyItem;
};
