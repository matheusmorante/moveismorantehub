import Order from "../types/order.type";
import { Item } from "../types/items.type";
import { supabase } from "./supabaseConfig";
import { reverseInventoryMove } from "./inventoryService";
import {
    canMaintainSaleStock,
    canCreateSaleExitForItem,
    hasTemporarySaleItem,
    isTemporarySaleItem,
    isTemporarySaleItemReconciliation,
    shouldProcessSaleStock,
} from './saleInventoryRules';
import { isEffectiveInventoryMove } from './movingAverageCostRules';

export {
    canMaintainSaleStock,
    canCreateSaleExitForItem,
    hasTemporarySaleItem,
    isTemporarySaleItemReconciliation,
    shouldProcessSaleStock,
} from './saleInventoryRules';

const trackedFields = (item?: Item) => JSON.stringify({
    productId: item?.productId || "",
    variationId: item?.variationId || "",
    quantity: Number(item?.quantity || 0),
    unitPrice: Number(item?.unitPrice || 0),
    unitDiscount: Number(item?.unitDiscount || 0),
    discountType: item?.discountType || "",
    costPrice: Number(item?.costPrice || 0),
    handlingType: item?.handlingType || "",
});

export const getChangedSaleItems = (previous: Order, current: Order) =>
    Array.from({ length: Math.max(previous.items?.length || 0, current.items?.length || 0) }, (_, index) => ({
        previous: previous.items?.[index],
        current: current.items?.[index],
    })).filter(({ previous, current }) => trackedFields(previous) !== trackedFields(current));

// Vincular o cadastro a uma venda já feita só identifica o produto para relatórios.
// Não é uma troca de mercadoria e, portanto, não pode alterar o estoque.

export const hasActualSaleExit = async (orderId: string) => {
    const { data, error } = await supabase
        .from("inventory_moves")
        .select("observation, reason")
        .eq("order_id", orderId)
        .in("type", ["exit", "withdrawal"]);

    if (error) throw error;
    return (data || []).some((move: any) => {
        try {
            const metadata = JSON.parse(move.observation || "{}");
            return metadata.status !== "reversed" && metadata.status !== "cancelled";
        } catch {
            return !String(move.reason || "").startsWith("Cancelamento da venda");
        }
    });
};

const comparableDescription = (item?: Item) => (item?.description || "").trim().toLocaleLowerCase("pt-BR");

/** Propaga somente a referência de catálogo à devolução vinculada, sem movimentar estoque. */
export const syncLinkedReturnProductReferences = async (saleOrderId: string, previous: Order, current: Order) => {
    const reconciledItems = getChangedSaleItems(previous, current)
        .filter(({ previous: oldItem, current: newItem }) => isTemporarySaleItemReconciliation(oldItem, newItem));
    if (!reconciledItems.length) return;

    const { data: returnRows, error } = await supabase
        .from("orders")
        .select("id, order_data")
        .eq("order_data->>linkedOrderId", saleOrderId)
        .eq("order_data->>orderType", "return");
    if (error) throw error;

    await Promise.all((returnRows || []).map(async (row: any) => {
        const returnOrder = row.order_data as Order;
        let wasUpdated = false;
        const items = (returnOrder.items || []).map(returnItem => {
            const matched = reconciledItems.find(({ previous: oldItem }) =>
                comparableDescription(oldItem) && comparableDescription(oldItem) === comparableDescription(returnItem)
            );
            if (!matched?.current) return returnItem;
            wasUpdated = true;
            return {
                ...returnItem,
                productId: matched.current.productId,
                variationId: matched.current.variationId,
                isTemporaryProduct: false,
            };
        });
        if (wasUpdated) {
            const reconciledReturn = { ...returnOrder, id: String(row.id), items } as Order;
            const { error: updateError } = await supabase.from("orders").update({
                order_data: reconciledReturn,
                updated_at: new Date().toISOString(),
            }).eq("id", row.id);
            if (updateError) throw updateError;

            if (reconciledReturn.status === 'fulfilled' && !reconciledReturn.returnStockProcessed) {
                const { processReturnInventoryEntries } = await import('./returnInventoryService');
                const processed = await processReturnInventoryEntries(String(row.id), reconciledReturn, { historical: true });
                if (processed) {
                    const { error: processedUpdateError } = await supabase.from('orders').update({
                        order_data: { ...reconciledReturn, returnStockProcessed: true },
                        updated_at: new Date().toISOString(),
                    }).eq('id', row.id);
                    if (processedUpdateError) throw processedUpdateError;
                }
            }
        }
    }));
};

export const reverseSaleItemMoves = async (orderId: string, item: Item, reason: string) => {
    if (!item?.productId) return;
    let query = supabase
        .from("inventory_moves")
        .select("id, observation, reason")
        .eq("order_id", orderId)
        .eq("product_id", item.productId);

    query = item.variationId ? query.eq("variation_id", item.variationId) : query.is("variation_id", null);
    const { data, error } = await query;
    if (error) throw error;

    await Promise.all((data || [])
        .filter(isEffectiveInventoryMove)
        .map((move: any) => reverseInventoryMove(String(move.id), reason, true)));
};
