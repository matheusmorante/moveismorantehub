export type OrderCirculationState = {
  status?: string | null;
  delivery_status?: string | null;
  deliveryStatus?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryFinishedAt?: string | null;
  pickupConfirmedAt?: string | null;
  shipping?: {
    deliveryStatus?: string | null;
    deliveryStartedAt?: string | null;
    deliveryArrivedAt?: string | null;
    deliveryFinishedAt?: string | null;
    pickupConfirmedAt?: string | null;
    unattendedAt?: string | null;
  } | null;
  order_data?: {
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
    row?.delivery_status || row?.deliveryStatus || shipping.deliveryStatus || ''
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
  ];
  if (physicalStatuses.some((status) => deliveryStatus.includes(status))) return true;
  if (
    shipping.deliveryStartedAt ||
    shipping.deliveryArrivedAt ||
    shipping.deliveryFinishedAt ||
    shipping.unattendedAt ||
    shipping.pickupConfirmedAt ||
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
  return ['fulfilled', 'atendido', 'completed'].includes(String(row?.status || '').toLowerCase());
};

/** @deprecated Use the business term `hasGoodsCirculated`. */
export const orderShowsPhysicalCirculation = hasGoodsCirculated;
