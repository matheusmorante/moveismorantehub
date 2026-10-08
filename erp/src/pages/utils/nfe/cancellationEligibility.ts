type OrderCirculationShipping = {
  deliveryMethod?: string | null;
  deliveryStatus?: string | null;
  deliveryStartedAt?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryFinishedAt?: string | null;
  pickupConfirmedAt?: string | null;
  unattendedAt?: string | null;
};

export type OrderCirculationState = {
  status?: string | null;
  delivery_status?: string | null;
  delivery_method?: string | null;
  delivery_started_at?: string | null;
  delivery_arrived_at?: string | null;
  delivery_finished_at?: string | null;
  deliveryStatus?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryFinishedAt?: string | null;
  pickupConfirmedAt?: string | null;
  shipping?: OrderCirculationShipping | null;
  order_data?: {
    deliveryStatus?: string | null;
    shipping?: {
      deliveryStatus?: string | null;
      deliveryStartedAt?: string | null;
      deliveryArrivedAt?: string | null;
      deliveryFinishedAt?: string | null;
      unattendedAt?: string | null;
      pickupConfirmedAt?: string | null;
    } | null;
    deliveryFinishedAt?: string | null;
    pickupConfirmedAt?: string | null;
  } | null;
};

export const hasGoodsCirculated = (row: OrderCirculationState | null | undefined) => {
  const data = row?.order_data || {};
  const shipping = data.shipping || row?.shipping || {};
  const deliveryStatus = String(
    row?.delivery_status || row?.deliveryStatus || data.deliveryStatus || shipping.deliveryStatus || ''
  ).toLowerCase();
  const physicalStatuses = [
    'in_transit',
    'in-transit',
    'delivered',
    'completed',
    'finished',
    'collected',
    'em_transito',
    'entregue',
    'concluido',
    'coletado',
    'out_for_delivery',
    'out-for-delivery',
    'em_rota',
    'em rota',
    'em_entrega',
    'em entrega',
    'returned',
    'returned_to_store',
    'returning',
    'refused',
    'recusado',
    'devolvido',
  ];
  if (physicalStatuses.some((status) => deliveryStatus.includes(status))) return true;
  if (
    shipping.deliveryStartedAt ||
    shipping.deliveryArrivedAt ||
    shipping.deliveryFinishedAt ||
    shipping.unattendedAt ||
    shipping.pickupConfirmedAt ||
    row?.delivery_started_at ||
    row?.delivery_arrived_at ||
    row?.delivery_finished_at ||
    row?.deliveryStartedAt ||
    row?.deliveryArrivedAt ||
    row?.deliveryFinishedAt ||
    row?.pickupConfirmedAt ||
    data.deliveryFinishedAt ||
    data.pickupConfirmedAt
  ) {
    return true;
  }

  // The ERP's fulfilled state means the sale was completed; missing delivery
  // metadata must not make an already fulfilled sale eligible for NF-e cancel.
  return ['fulfilled', 'atendido', 'completed', 'delivered', 'entregue', 'retirado', 'collected'].includes(
    String(row?.status || '').toLowerCase()
  );
};

export type GoodsCirculationState = 'none' | 'in_progress' | 'completed';

/** Distinguishes a completed delivery from movement that still needs return/recusal handling. */
export function getGoodsCirculationState(
  row: OrderCirculationState | null | undefined
): GoodsCirculationState {
  const data = row?.order_data || {};
  const shipping = data.shipping || row?.shipping || {};
  const deliveryStatus = String(
    row?.delivery_status || row?.deliveryStatus || data.deliveryStatus || shipping.deliveryStatus || ''
  ).toLowerCase();
  const completedStatuses = new Set([
    'delivered',
    'entregue',
    'completed',
    'finished',
    'concluido',
    'collected',
    'coletado',
    'retirado',
  ]);
  const orderStatus = String(row?.status || '').toLowerCase();
  if (
    ['fulfilled', 'atendido', 'completed', 'delivered', 'entregue', 'retirado', 'collected'].includes(
      orderStatus
    ) ||
    completedStatuses.has(deliveryStatus) ||
    shipping.deliveryFinishedAt ||
    shipping.pickupConfirmedAt ||
    row?.delivery_finished_at ||
    row?.deliveryFinishedAt ||
    row?.pickupConfirmedAt ||
    data.deliveryFinishedAt ||
    data.pickupConfirmedAt
  ) {
    return 'completed';
  }
  return hasGoodsCirculated(row) ? 'in_progress' : 'none';
}

/** @deprecated Use the business term `hasGoodsCirculated`. */
export const orderShowsPhysicalCirculation = hasGoodsCirculated;
