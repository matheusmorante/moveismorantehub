import { useState, useEffect, useCallback } from 'react';

function capitalizeName(name: string): string {
  if (!name) return '';
  const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para'];
  return name
    .toLowerCase()
    .split(' ')
    .map((word) =>
      lowercaseWords.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}
import type Order from '@/pages/types/order.type';
import { subscribeToOrderChanges } from '@/pages/utils/orderHistoryService';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withAbortTimeout } from '../../../../../../../shared-utils/withAbortTimeout';

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
export const useInventoryOrdersLookup = (references: string[] = []): InventoryOrdersLookupResult => {
  const [ordersMap, setOrdersMap] = useState<Record<string, Order>>({});
  const referenceKey = JSON.stringify([...new Set(references.filter((value) => /^[a-z0-9_-]+$/i.test(value)))].sort());

  useEffect(() => {
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      const request = new AbortController(); controller = request;
      const keys: string[] = JSON.parse(referenceKey);
      if (!keys.length) { setOrdersMap({}); return; }
      const columns = 'id,order_number,order_index,customer_name,customer_data_full_name:order_data->customerData->>fullName';
      const codes = keys.filter((key) => /^\d+$/.test(key));
      const queries = [supabase.from('orders').select(columns).in('id', keys)];
      if (codes.length) queries.push(supabase.from('orders').select(columns).in('order_index', codes.map((value) => value.replace(/^0+/, '') || '0')));
      const outcomes = await Promise.allSettled(queries.map((query) => withAbortTimeout(query, 'estoque:pedidos-referenciados', 15_000, request.signal)));
      if (request.signal.aborted) return;
      const map: Record<string, Order> = {};
      outcomes.forEach((outcome) => {
        if (outcome.status !== 'fulfilled' || outcome.value.error) return;
        (outcome.value.data || []).forEach((row: any) => {
          const order = { id: String(row.id), orderNumber: row.order_number, orderIndex: row.order_index,
            customerData: { fullName: row.customer_name || row.customer_data_full_name || row.customer_data?.fullName || '' } } as Order;
          if (order.id) map[String(order.id)] = order;
          const orderCode = formatOrderCode(order);
          if (orderCode) map[orderCode] = order;
          if (row.order_index != null) map[String(row.order_index)] = order;
          if (row.order_number) map[String(row.order_number)] = order;
        });
      });
      setOrdersMap(map);
    };
    setOrdersMap({});
    void load();
    const unsubscribe = subscribeToOrderChanges(() => void load());
    return () => { controller?.abort(); unsubscribe(); };
  }, [referenceKey]);

  const formatOrderLabel = useCallback(
    (orderIdOrCode: string): string | null => {
      if (!orderIdOrCode) return null;
      const normalized = String(orderIdOrCode).trim();
      const order = ordersMap[normalized];
      if (order) {
        const code = formatOrderCode(order);
        const orderWithCustomer = order as OrderCustomerLike;
        const customerName = capitalizeName(
          order.customerData?.fullName || orderWithCustomer.customerName || ''
        );
        return customerName
          ? `Pedido de venda #${code} - ${customerName}`
          : `Pedido de venda #${code}`;
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
          const customerName = capitalizeName(
            order.customerData?.fullName || orderWithCustomer.customerName || ''
          );
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
