import Order from "../types/order.type";
import { Item } from "../types/items.type";
import { supabase } from "./supabaseConfig";
import { reverseInventoryMove } from "./inventoryService";

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

export const hasTemporarySaleItem = (order: Order) =>
    (order.items || []).some((item) => !item.productId || item.productId.trim() === "" || item.isTemporaryProduct);

export const getChangedSaleItems = (previous: Order, current: Order) =>
    Array.from({ length: Math.max(previous.items?.length || 0, current.items?.length || 0) }, (_, index) => ({
        previous: previous.items?.[index],
        current: current.items?.[index],
    })).filter(({ previous, current }) => trackedFields(previous) !== trackedFields(current));

export const hasCatalogSaleItem = (order: Order) =>
    (order.items || []).some((item) => Boolean(item.productId?.trim()) && !item.isTemporaryProduct);

export const canMaintainSaleStock = (order: Order) =>
    order.orderType === "sale" && ["scheduled", "fulfilled"].includes(order.status || "");

export const reverseSaleItemMoves = async (orderId: string, item: Item, reason: string) => {
    if (!item?.productId) return;
    let query = supabase
        .from("inventory_moves")
        .select("id, status, observation, reason")
        .eq("order_id", orderId)
        .eq("product_id", item.productId);

    query = item.variationId ? query.eq("variation_id", item.variationId) : query.is("variation_id", null);
    const { data, error } = await query;
    if (error) throw error;

    await Promise.all((data || [])
        .filter((move: any) => move.status !== "reversed" && move.status !== "cancelled")
        .map((move: any) => reverseInventoryMove(String(move.id), reason, true)));
};
