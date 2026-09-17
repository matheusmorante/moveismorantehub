import Order from "../types/order.type";

export const POST_SALE_ACTION_KEYS = new Set([
    "printShippingOrder",
    "printReceipt",
    "sendShippingOrder",
    "sendCustomerOrder",
    "sendGroupInvite",
    "sendCustomerReviews",
]);

export const canOpenPostSaleActions = (order: Partial<Order> | { orderType?: string; status?: string }): boolean => {
    const status = String(order.status || "").trim().toLowerCase();
    return (order.orderType || "sale") === "sale" && status === "scheduled";
};
