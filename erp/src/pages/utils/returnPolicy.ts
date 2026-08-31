import Order from "../types/order.type";

export const canGenerateReturn = (order: Order): boolean =>
    (order.orderType || "sale") === "sale" && order.status === "fulfilled";
