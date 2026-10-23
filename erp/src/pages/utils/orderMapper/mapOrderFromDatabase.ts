import Order, { OrderType } from '../../types/order.type';
import { capitalizeOrder } from '../formatters';
import { OrderDatabaseRow } from './orderMapperTypes';
import { setPersistedOrderDataSnapshot } from './orderSnapshots';
import { mapPaymentsAndSummary } from './orderPaymentsMapper';
import { mapOrderItemsAndSummary } from './orderItemsMapper';
import { mapCustomerData } from './orderCustomerMapper';
import { mapOrderShipping } from './orderShippingMapper';

/**
 * Mapper Canônico: Converte a linha bruta do banco Supabase para o modelo de domínio Order.
 * Regra: As colunas estruturadas são a FONTE DE VERDADE (Master).
 * O objeto order_data é consumido apenas para snapshots históricos ou fallback temporário.
 */
export function mapOrderFromDatabase(row: OrderDatabaseRow): Order {
  const rawLegacy =
    row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data)
      ? { ...row.order_data }
      : {};
  delete rawLegacy.isRegisteredInBling;
  delete rawLegacy.is_registered_in_bling;

  const id = String(row.id || rawLegacy.id || '');

  // Status: Fonte de verdade é row.status
  const status = (row.status || rawLegacy.status || 'draft').trim();

  // Tipo de pedido
  const orderType = (row.order_type || rawLegacy.orderType || 'sale') as OrderType;

  // Número e índice do pedido
  const rawNumber =
    row.order_index ??
    (row.order_number != null && !isNaN(Number(row.order_number))
      ? Number(row.order_number)
      : (rawLegacy.orderIndex ??
        (rawLegacy.orderNumber ? Number(rawLegacy.orderNumber) : undefined)));
  const orderIndex = rawNumber != null ? Number(rawNumber) : undefined;
  const orderNumber = orderIndex;

  // Valores financeiros
  const totalAmount =
    row.total_amount != null
      ? Number(row.total_amount)
      : Number(rawLegacy.totalAmount || rawLegacy.total || 0);

  // Pagamentos e resumo de pagamentos
  const { payments, paymentsSummary } = mapPaymentsAndSummary(row, rawLegacy, totalAmount);

  // Vendedor
  const seller = row.seller_name || rawLegacy.seller || '';
  const sellerId = row.seller_id || rawLegacy.sellerId || undefined;

  // Itens e resumo de itens
  const { items, itemsSummary } = mapOrderItemsAndSummary(row, rawLegacy, totalAmount);

  // Cliente e Snapshots
  const customerData = mapCustomerData(row, rawLegacy);

  // Frete e agendamento
  const shipping = mapOrderShipping(row, rawLegacy);

  // Flags operacionais
  const deleted = row.deleted != null ? Boolean(row.deleted) : Boolean(rawLegacy.deleted);
  const deletedAt = row.deleted_at || rawLegacy.deletedAt || null;
  const stockProcessed =
    row.stock_processed != null ? Boolean(row.stock_processed) : Boolean(rawLegacy.stockProcessed);
  const isStockChecked =
    row.is_stock_checked != null
      ? Boolean(row.is_stock_checked)
      : Boolean(rawLegacy.isStockChecked);
  const marketingOrigin =
    row.marketing_origin || rawLegacy.marketingOrigin || customerData.marketingOrigin || 'organic';

  // Montagem final preservando snapshots complementares
  const orderDomain: Order = {
    ...rawLegacy,
    id,
    updatedAt: row.updated_at || undefined,
    status,
    deliveryStatus: row.delivery_status || rawLegacy.deliveryStatus || null,
    deliveryArrivedAt: row.delivery_arrived_at || rawLegacy.deliveryArrivedAt || null,
    deliveryStartedAt: row.delivery_started_at || rawLegacy.deliveryStartedAt || null,
    deliveryFinishedAt: row.delivery_finished_at || rawLegacy.deliveryFinishedAt || null,
    deliveryResponsibles: rawLegacy.deliveryResponsibles || rawLegacy.shipping?.deliveryResponsibles || null,
    deliveryResponsibleName: rawLegacy.deliveryResponsibleName || rawLegacy.shipping?.deliveryResponsibleName || null,
    deliveryResponsibleId: rawLegacy.deliveryResponsibleId || null,
    pickupConfirmedAt: rawLegacy.pickupConfirmedAt || null,
    orderType,
    orderIndex,
    orderNumber,
    date: rawLegacy.date || row.created_at || new Date().toISOString(),
    customerData,
    seller,
    sellerId,
    items,
    itemsSummary,
    payments,
    paymentsSummary,
    shipping,
    observation: row.notes || rawLegacy.observation || '',
    deleted,
    deletedAt,
    stockProcessed,
    isStockChecked,
    marketingOrigin,
    returnOrderId: row.return_order_id || rawLegacy.returnOrderId || undefined,
    linkedOrderId: row.linked_order_id || rawLegacy.linkedOrderId || undefined,
    linkedOrderCode: rawLegacy.linkedOrderCode || undefined,
    linkedOrderDeliveryMethod: rawLegacy.linkedOrderDeliveryMethod || undefined,
    returnKind: (row.return_kind as any) || rawLegacy.returnKind || undefined,
    returnedTotalAmount:
      row.returned_total_amount != null
        ? Number(row.returned_total_amount)
        : rawLegacy.returnedTotalAmount,
    originalSoldTotal:
      row.original_sold_total != null
        ? Number(row.original_sold_total)
        : rawLegacy.originalSoldTotal,
  };

  const mappedOrder = capitalizeOrder(orderDomain);
  if (row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data)) {
    setPersistedOrderDataSnapshot(mappedOrder, rawLegacy);
  }
  return mappedOrder;
}
