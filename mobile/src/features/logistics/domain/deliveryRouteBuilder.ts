import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import {
  getLocationMapsUrl,
  parseCoordinatesFromMapsUrl,
  isCancelledOrder,
  formatOrderCode,
} from '../../../utils/orderUtils';
import { getDeliverySchedulePeriod } from '../utils/deliverySchedulePeriod';
import { countDeliveryObservations } from '../utils/countDeliveryObservations';
import {
  getOperationActivityPresentation,
  type OperationActivityType,
} from '../../schedule/utils/operationActivity';
import { classifyDeliveryService } from './deliveryServiceClassification';

export interface DeliveryRouteItem {
  id: string;
  order: any;
  orderIndex?: string;
  customerName: string;
  fullAddress: string;
  mapsUrl?: string | null;
  itemsCount: number;
  sequence: number;
  status:
    | 'pending'
    | 'in_progress'
    | 'arrived'
    | 'in_service'
    | 'completed'
    | 'unattended'
    | 'cancelled';
  coords: { latitude: number; longitude: number } | null;
  hasValidCoords: boolean;
  distanceKm?: number;
  durationMin?: number;
  phone?: string;
  observations?: string;
  observationCount?: number;
  isCurrent: boolean;
  isNext: boolean;
  periodLabel: string;
  isFixedTime: boolean;
  windowStart?: string;
  windowEnd?: string;
  isSuggestedFirst?: boolean;
  restrictionLevel?: 'free' | 'priority' | 'fixed';
  activityType: OperationActivityType;
  activityLabel: string;
  activityColor: string;
  activityBackgroundColor: string;
}

export type DeliveryRouteDateScope = 'today' | 'next_days';

export const buildDeliveryRouteItems = (
  orders: any[],
  dateScope: DeliveryRouteDateScope,
  todayStr: string
): DeliveryRouteItem[] => {
  const scopedOrders = orders.filter((o) => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

    const shipping = oData.shipping || o.shipping || {};
    const isLegacyPickup = String(shipping.deliveryType || '')
      .toLowerCase()
      .includes('retirada');
    if (classifyDeliveryService(o).isPickup || isLegacyPickup) return false;

    const rawSchedDate = getOperationalScheduleDate(o);
    return dateScope === 'today'
      ? rawSchedDate === todayStr
      : Boolean(rawSchedDate && rawSchedDate > todayStr);
  });

  const sorted = [...scopedOrders].sort((a, b) => {
    const seqA = a.order_data?.routeSequence ?? 9999;
    const seqB = b.order_data?.routeSequence ?? 9999;
    if (seqA !== seqB) return seqA - seqB;

    const shippingA = a.order_data?.shipping || {};
    const shippingB = b.order_data?.shipping || {};
    const periodA = getDeliverySchedulePeriod(shippingA);
    const periodB = getDeliverySchedulePeriod(shippingB);

    if (periodA.sortWeight !== periodB.sortWeight) {
      return periodA.sortWeight - periodB.sortWeight;
    }

    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  let firstInProgressId: string | null = null;
  let firstPendingId: string | null = null;

  for (const o of sorted) {
    const dStatus =
      o.order_data?.deliveryStatus ||
      o.delivery_status ||
      (o.status === 'fulfilled' ? 'completed' : 'pending');
    if (dStatus === 'in_progress' || dStatus === 'arrived' || dStatus === 'in_service') {
      if (!firstInProgressId) firstInProgressId = o.id;
    } else if (dStatus !== 'completed' && dStatus !== 'unattended') {
      if (!firstPendingId) firstPendingId = o.id;
    }
  }

  const activeTargetId = firstInProgressId || firstPendingId;

  const topPendingItem = sorted.find((o) => {
    const dStatus =
      o.order_data?.deliveryStatus ||
      o.delivery_status ||
      (o.status === 'fulfilled' ? 'completed' : 'pending');
    return (
      dStatus !== 'completed' &&
      dStatus !== 'unattended' &&
      dStatus !== 'in_progress' &&
      dStatus !== 'arrived' &&
      dStatus !== 'in_service'
    );
  });
  const topPendingId = topPendingItem?.id;

  return sorted.map((o, idx) => {
    const oData = o.order_data || {};
    const customer = oData.customerData || o.customer || {};
    const shipping = oData.shipping || {};
    const dCoords = shipping.destinationCoords;
    const mapsUrl = getLocationMapsUrl(o);

    let coords: { latitude: number; longitude: number } | null = null;
    let hasValidCoords = false;

    if (mapsUrl) {
      const parsedCoords = parseCoordinatesFromMapsUrl(mapsUrl);
      if (parsedCoords) {
        coords = parsedCoords;
        hasValidCoords = true;
      }
    }

    if (
      !hasValidCoords &&
      Array.isArray(dCoords) &&
      dCoords.length === 2 &&
      dCoords[0] !== 0 &&
      dCoords[1] !== 0
    ) {
      coords = { latitude: Number(dCoords[1]), longitude: Number(dCoords[0]) };
      hasValidCoords = true;
    }

    const rawDeliveryStatus = oData.deliveryStatus || o.delivery_status;
    let status: DeliveryRouteItem['status'] = 'pending';
    if (
      o.status === 'fulfilled' ||
      rawDeliveryStatus === 'completed' ||
      rawDeliveryStatus === 'fulfilled'
    ) {
      status = 'completed';
    } else if (rawDeliveryStatus === 'unattended') {
      status = 'unattended';
    } else if (rawDeliveryStatus === 'in_service') {
      status = 'in_service';
    } else if (rawDeliveryStatus === 'arrived') {
      status = 'arrived';
    } else if (rawDeliveryStatus === 'in_progress') {
      status = 'in_progress';
    }

    const items = oData.items || o.items || oData.assistanceItems || [];
    const itemCount = Array.isArray(items) ? items.length : 0;
    const observation =
      oData.observation ?? oData.observations ?? o.observation ?? o.observations;
    const deliveryAddressObservation = shipping.deliveryAddress?.observation;
    const isCurrent =
      status === 'in_progress' || status === 'arrived' || status === 'in_service';
    const isNext = !firstInProgressId && o.id === activeTargetId;

    const periodInfo = getDeliverySchedulePeriod(shipping);
    const isSuggestedFirst = o.id === topPendingId;
    const activity = getOperationActivityPresentation(o);

    let restrictionLevel: DeliveryRouteItem['restrictionLevel'] = 'free';
    if (periodInfo.isFixed) {
      restrictionLevel = 'fixed';
    } else if (periodInfo.label.includes('⚠️') || periodInfo.label.includes('URGENTE')) {
      restrictionLevel = 'priority';
    }

    return {
      id: o.id,
      order: o,
      orderIndex: formatOrderCode(o),
      customerName: (customer.fullName || o.customer_name || 'Consumidor').toUpperCase(),
      fullAddress: [
        shipping.deliveryAddress?.street || customer.fullAddress?.street,
        shipping.deliveryAddress?.number || customer.fullAddress?.number,
        shipping.deliveryAddress?.neighborhood || customer.fullAddress?.neighborhood,
        shipping.deliveryAddress?.city || customer.fullAddress?.city || 'Colombo',
      ]
        .filter(Boolean)
        .join(', '),
      mapsUrl,
      itemsCount: itemCount,
      sequence: idx + 1,
      status,
      coords,
      hasValidCoords,
      distanceKm: shipping.distance ? Number(Number(shipping.distance).toFixed(1)) : undefined,
      durationMin: shipping.durationMinutes ? Number(shipping.durationMinutes) : undefined,
      phone: customer.phone,
      observations: typeof observation === 'string' ? observation : undefined,
      observationCount: countDeliveryObservations([observation, deliveryAddressObservation]),
      isCurrent,
      isNext,
      periodLabel: periodInfo.label,
      isFixedTime: periodInfo.isFixed,
      windowStart: periodInfo.windowStart,
      windowEnd: periodInfo.windowEnd,
      isSuggestedFirst,
      restrictionLevel,
      activityType: activity.type,
      activityLabel: activity.label,
      activityColor: activity.color,
      activityBackgroundColor: activity.backgroundColor,
    };
  });
};

export const computeDeliveryRouteStats = (routeItems: DeliveryRouteItem[]) => {
  const total = routeItems.length;
  const completed = routeItems.filter((i) => i.status === 'completed').length;
  const unattended = routeItems.filter((i) => i.status === 'unattended').length;
  const pending = total - completed - unattended;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    unattended,
    pending,
    percent,
  };
};
