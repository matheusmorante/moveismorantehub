import { useState, useEffect, useCallback } from 'react';

function capitalizeName(name: string): string {
    if (!name) return '';
    const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para'];
    return name
        .toLowerCase()
        .split(' ')
        .map(word => lowercaseWords.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
import Order from '../../../types/order.type';
import { subscribeToOrders } from '@/pages/utils/orderHistoryService';
import { formatOrderCode } from '@/pages/utils/orderCode';

interface OrderCustomerLike extends Partial<Order> {
    readonly customerName?: string;
}

export interface InventoryOrdersLookupResult {
    readonly ordersMap: Readonly<Record<string, Order>>;
    readonly formatOrderLabel: (orderIdOrCode: string) => string | null;
    readonly formatReversalReason: (reasonText: string, relatedEntityId?: string) => string;
}

/**
 * Hook para lookup rápido de pedidos de venda por ID ou código formatado,
 * permitindo enriquecer o histórico de estoque com dados do cliente e motivo de cancelamento.
 */
export const useInventoryOrdersLookup = (): InventoryOrdersLookupResult => {
    const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});

    useEffect(() => {
        const unsubscribe = subscribeToOrders((ordersList) => {
            const map: Record<string, Order> = {};
            ordersList.forEach((order) => {
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

    const formatOrderLabel = useCallback(
        (orderIdOrCode: string): string | null => {
            if (!orderIdOrCode) return null;
            const normalized = String(orderIdOrCode).trim();
            const order = ordersMap[normalized];
            if (order) {
                const code = formatOrderCode(order);
                const orderWithCustomer = order as OrderCustomerLike;
                const customerName = capitalizeName(order.customerData?.fullName || orderWithCustomer.customerName || '');
                return customerName ? `Pedido de venda #${code} - ${customerName}` : `Pedido de venda #${code}`;
            }
            return null;
        },
        [ordersMap]
    );

    const formatReversalReason = useCallback(
        (reasonText: string, relatedEntityId?: string): string => {
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
                    const orderWithCustomer = order as OrderCustomerLike;
                    const customerName = capitalizeName(order.customerData?.fullName || orderWithCustomer.customerName || '');
                    return customerName
                        ? `Cancelamento da venda #${code} - ${customerName}`
                        : `Cancelamento da venda #${code}`;
                }
            }

            return reasonText;
        },
        [ordersMap]
    );

    return { ordersMap, formatOrderLabel, formatReversalReason };
};

export default useInventoryOrdersLookup;
