import Order from "../types/order.type";

export const buildCancelledReturn = (order: Order): Partial<Order> => {
    if (order.orderType !== "return") {
        throw new Error("O pedido informado não é uma devolução.");
    }
    if (order.status === "fulfilled" || order.returnStockProcessed) {
        throw new Error("Uma devolução atendida não pode ser cancelada.");
    }

    return {
        status: "cancelled",
        returnStockProcessed: false,
    };
};

export const clearReturnLink = (): Partial<Order> => ({
    returnOrderId: undefined as any,
    returnKind: undefined,
});
