export type OrderCirculationState = {
  status?: string | null;
  delivery_status?: string | null;
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

export const orderShowsPhysicalCirculation = (row: OrderCirculationState | null | undefined) => {
  const data = row?.order_data || {};
  const shipping = data.shipping || {};
  const deliveryStatus = String(
    row?.delivery_status || shipping.deliveryStatus || ''
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
    data.deliveryFinishedAt ||
    data.pickupConfirmedAt
  ) {
    return true;
  }

  // The ERP's fulfilled state means the sale was completed; missing delivery
  // metadata must not make an already fulfilled sale eligible for NF-e cancel.
  return row?.status === 'fulfilled';
};
