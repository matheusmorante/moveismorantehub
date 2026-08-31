import Order from "../types/order.type";

export const POST_SALE_ACTION_KEYS = new Set([
    "printShippingOrder",
    "printReceipt",
    "sendShippingOrder",
    "sendCustomerOrder",
    "sendGroupInvite",
    "sendCustomerReviews",
]);

export const canOpenPostSaleActions = (order: Order): boolean => {
    const status = String(order.status || "").trim().toLowerCase();
    return (order.orderType || "sale") === "sale" && ["scheduled", "fulfilled"].includes(status);
};
