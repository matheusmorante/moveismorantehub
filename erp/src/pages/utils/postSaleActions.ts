import Order from "../types/order.type";

export const POST_SALE_ACTION_KEYS = new Set([
    "printShippingOrder",
    "printReceipt",
    "sendShippingOrder",
    "sendCustomerOrder",
    "sendGroupInvite",
    "sendCustomerReviews",
    "issueNfe",
]);

export const canOpenPostSaleActions = (order: Partial<Order> | { orderType?: string; status?: string }): boolean => {
    const status = String(order.status || "").trim().toLowerCase();
    const isValidType = (order.orderType || "sale") === "sale";
    const isValidStatus = status === "scheduled" || status === "fulfilled";
    return isValidType && isValidStatus;
};
