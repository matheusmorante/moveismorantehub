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
    autoFulfilledAfter12h?: boolean | null;
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

const hasCompletedGoodsCirculation = (row: OrderCirculationState | null | undefined) => {
  const data = row?.order_data || {};
  const shipping = data.shipping || row?.shipping || {};
  const deliveryStatus = String(
    row?.delivery_status || row?.deliveryStatus || data.deliveryStatus || shipping.deliveryStatus || ''
  ).trim().toLowerCase();
  const orderStatus = String(row?.status || '').trim().toLowerCase();

  if (['delivered', 'entregue', 'retirado'].includes(deliveryStatus)) {
    return true;
  }

  // Confirmed facts remain blocking even when a legacy automatic flag is present.
  const deliveryConfirmedAt =
    shipping.deliveryFinishedAt || row?.delivery_finished_at || row?.deliveryFinishedAt || data.deliveryFinishedAt;
  const pickupConfirmedAt = shipping.pickupConfirmedAt || row?.pickupConfirmedAt || data.pickupConfirmedAt;
  if (deliveryConfirmedAt || pickupConfirmedAt) return true;

  // The ERP's fulfilled state is shown as Entregue or Retirado after explicit confirmation.
  return ['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'].includes(orderStatus);
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
  if (hasCompletedGoodsCirculation(row)) return 'completed';

  // Saída/trânsito já impede cancelamento por operação não realizada.
  const unfinishedStatuses = new Set([
    'in_transit',
    'in-transit',
    'out_for_delivery',
    'out-for-delivery',
    'em_transito',
    'em_rota',
    'em rota',
    'em_entrega',
    'em entrega',
    'in_progress',
    'in_service',
    'unattended',
    'refused',
    'recusado',
    'returning',
    'returned',
    'returned_to_store',
    'devolvido',
  ]);
  const normalizedDeliveryStatus = deliveryStatus.trim().toLowerCase();
  if (
    data.autoFulfilledAfter12h === true ||
    unfinishedStatuses.has(normalizedDeliveryStatus) ||
    shipping.deliveryStartedAt ||
    shipping.deliveryArrivedAt ||
    shipping.unattendedAt ||
    row?.delivery_started_at ||
    row?.delivery_arrived_at ||
    row?.deliveryStartedAt ||
    row?.deliveryArrivedAt
  ) {
    return 'in_progress';
  }
  return 'none';
}

export const hasGoodsCirculated = (row: OrderCirculationState | null | undefined) =>
  getGoodsCirculationState(row) !== 'none';

/** @deprecated Use the business term `hasGoodsCirculated`. */
export const orderShowsPhysicalCirculation = hasGoodsCirculated;
