import Order from "../types/order.type";

export const buildCancelledReturn = (order: Order): Partial<Order> => {
    if (order.orderType !== "return") {
        throw new Error("O pedido informado não é uma devolução.");
    }
    if (order.status === "cancelled") {
        throw new Error("Esta devolução já foi cancelada.");
    }

    return {
        status: "cancelled",
        returnStockProcessed: false,
        returnStockReversed: true,
    };
};

export const clearReturnLink = (): Partial<Order> => ({
    returnOrderId: null as any,
    returnKind: null as any,
});
