import { useState, useEffect } from "react";
import Order from "../../../types/order.type";
import { subscribeToOrders } from "@/pages/utils/orderHistoryService";
import { formatOrderCode } from "@/pages/utils/orderCode";

export const useInventoryOrdersLookup = () => {
    const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});

    useEffect(() => {
        const unsubscribe = subscribeToOrders((ordersList) => {
            const map: Record<string, Order> = {};
            ordersList.forEach(order => {
                if (order.id) {
                    map[String(order.id)] = order;
                }
                const orderCode = formatOrderCode(order);
                if (orderCode) {
                    map[orderCode] = order;
                }
            });
            setOrdersMap(map);
        });
        return () => unsubscribe();
    }, []);

    const formatOrderLabel = (orderIdOrCode: string): string | null => {
        if (!orderIdOrCode) return null;
        const normalized = String(orderIdOrCode).trim();
        const order = ordersMap[normalized];
        if (order) {
            const code = formatOrderCode(order);
            const customerName = order.customerData?.fullName || (order as any).customerName || '';
            return customerName ? `Pedido de venda #${code} - ${customerName}` : `Pedido de venda #${code}`;
        }
        return null;
    };

    const formatReversalReason = (reasonText: string, relatedEntityId?: string): string => {
        if (!reasonText) return '';
        
        // Se já tiver nome de cliente/fábrica (com hífen ' - '), retorna diretamente
        if (reasonText.includes(' - ')) {
            return reasonText;
        }

        // Se for "Cancelamento da venda #..."
        const match = reasonText.match(/Cancelamento da venda\s*#?([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
            const key = match[1];
            const order = ordersMap[key] || (relatedEntityId ? ordersMap[relatedEntityId] : undefined);
            if (order) {
                const code = formatOrderCode(order);
                const customerName = order.customerData?.fullName || (order as any).customerName || '';
                return customerName ? `Cancelamento da venda #${code} - ${customerName}` : `Cancelamento da venda #${code}`;
            }
        }

        return reasonText;
    };

    return { ordersMap, formatOrderLabel, formatReversalReason };
};
