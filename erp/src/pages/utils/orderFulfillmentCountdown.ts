import type Order from '../types/order.type';

export interface FulfillmentCountdown {
  isPastDelivery: boolean;
  daysPassed: number;
  daysRemaining: number;
  isExpired: boolean;
  countdownLabel: string;
  deadline: Date | null;
  hoursRemaining: number | null;
}

const DEFAULT_AUTO_FULFILL_DAYS = 5;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

type OrderSchedule = {
  date?: string;
  endDate?: string;
  dateType?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  pendingScheduling?: boolean;
};

const getOrderSchedule = (order: Order): OrderSchedule | null => {
  const source = order as any;
  return (
    source.shipping?.scheduling ||
    source.order_data?.shipping?.scheduling ||
    source.order_data?.schedule ||
    null
  );
};

const getOrderType = (order: Order): string => {
  const source = order as any;
  return String(
    source.orderType ||
      source.order_type ||
      source.order_data?.orderType ||
      source.order_data?.order_type ||
      ''
  ).toLowerCase();
};

const getReturnMethod = (order: Order): string => {
  const source = order as any;
  return String(
    source.returnMethod || source.order_data?.returnMethod || source.order_data?.return_method || ''
  ).toLowerCase();
};

const isDeliveryOrder = (order: Order): boolean => {
  const source = order as any;
  const method = String(
    source.shipping?.deliveryMethod ||
      source.order_data?.shipping?.deliveryMethod ||
      source.order_data?.deliveryMethod ||
      'delivery'
  ).toLowerCase();
  return method !== 'pickup' && method !== 'retirada';
};

const isScheduledReturnCollection = (order: Order): boolean =>
  getOrderType(order) === 'return' &&
  order.status === 'scheduled' &&
  getReturnMethod(order) !== 'store_delivery';

const parseScheduleDate = (value: string): Date | null => {
  const cleanDate = value.split('T')[0].trim();
  const parts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
  if (parts.length !== 3) return null;

  const day = Number(cleanDate.includes('/') ? parts[0] : parts[2]);
  const month = Number(parts[1]);
  const year = Number(cleanDate.includes('/') ? parts[2] : parts[0]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};


/** Data/hora limite da coleta. Sem horário, a coleta vence ao final do dia agendado. */
/** Data limite da coleta: meia-noite BRT após o último dia agendado. */
export const parseReturnCollectionDeadline = (order: Order): Date | null => {
  if (!isScheduledReturnCollection(order)) return null;

  const schedule = getOrderSchedule(order);
  if (!schedule || schedule.pendingScheduling) return null;

  const source = order as any;
  const isRange = schedule.dateType === 'range' || schedule.type === 'range';
  const dateValue =
    (isRange && schedule.endDate ? schedule.endDate : schedule.date) ||
    source.scheduled_date ||
    source.scheduledDate ||
    source.order_data?.scheduledDate;
  if (typeof dateValue !== 'string' || !dateValue.trim()) return null;

  const deadline = parseScheduleDate(dateValue);
  if (!deadline) return null;

  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(0, 0, 0, 0);
  return deadline;
};

/**
 * Converte a string de data de entrega do agendamento em objeto Date (à meia-noite).
 * Trata formatos "DD/MM/YYYY" e "YYYY-MM-DD", além de range usando a data final.
 */
export function parseOrderDeliveryDate(order: Order): Date | null {
  const schedule = getOrderSchedule(order);
  if (!schedule || schedule.pendingScheduling) return null;

  const source = order as any;
  const dateValue =
    ((schedule.dateType === 'range' || schedule.type === 'range') && schedule.endDate
      ? schedule.endDate
      : schedule.date) ||
    source.scheduled_date ||
    source.scheduledDate ||
    source.order_data?.scheduledDate;
  if (typeof dateValue !== 'string' || !dateValue.trim()) return null;

  return parseScheduleDate(dateValue);
}

export const parseScheduleTime = (order: Order): { hours: number; minutes: number } | null => {
  const schedule = getOrderSchedule(order);
  const source = order as any;
  const rawEndTime =
    schedule?.endTime ||
    source.scheduled_end_time ||
    source.scheduledEndTime ||
    source.order_data?.scheduled_end_time;

  if (typeof rawEndTime === 'string' && rawEndTime.trim()) {
    const match = rawEndTime.trim().match(/^([0-9]{1,2}):([0-9]{2})/);
    if (match) {
      return { hours: Number(match[1]), minutes: Number(match[2]) };
    }
  }

  const rawTime =
    schedule?.time ||
    source.scheduled_time ||
    source.scheduledTime ||
    source.order_data?.scheduled_time;

  if (typeof rawTime === 'string' && rawTime.trim()) {
    const rangeMatch = rawTime.trim().match(/[0-9]{1,2}:[0-9]{2}.*?([0-9]{1,2}):([0-9]{2})/);
    if (rangeMatch) {
      return { hours: Number(rangeMatch[1]), minutes: Number(rangeMatch[2]) };
    }
    const singleMatch = rawTime.trim().match(/^([0-9]{1,2}):([0-9]{2})/);
    if (singleMatch) {
      return { hours: Number(singleMatch[1]), minutes: Number(singleMatch[2]) };
    }
  }

  const rawStartTime =
    schedule?.startTime ||
    source.scheduled_start_time ||
    source.scheduledStartTime ||
    source.order_data?.scheduled_start_time;

  if (typeof rawStartTime === 'string' && rawStartTime.trim()) {
    const match = rawStartTime.trim().match(/^([0-9]{1,2}):([0-9]{2})/);
    if (match) {
      return { hours: Number(match[1]), minutes: Number(match[2]) };
    }
  }

  return null;
};

/** Calcula o prazo da coleta agendada ou a confirmação automática da venda. */
export function getOrderFulfillmentCountdown(
  order: Order,
  maxDays = DEFAULT_AUTO_FULFILL_DAYS,
  now = new Date()
): FulfillmentCountdown {
  if (isScheduledReturnCollection(order)) {
    const deadline = parseReturnCollectionDeadline(order);
    if (!deadline) {
      return {
        isPastDelivery: false,
        daysPassed: 0,
        daysRemaining: 0,
        isExpired: false,
        countdownLabel: '',
        deadline: null,
        hoursRemaining: null,
      };
    }

    const remainingMs = deadline.getTime() - now.getTime();
    const isExpired = remainingMs <= 0;
    const hoursRemaining = Math.max(0, Math.ceil(remainingMs / MILLISECONDS_PER_HOUR));
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    const timeRemainingLabel =
      remainingMinutes < 60
        ? `${remainingMinutes}min`
        : `${Math.floor(remainingMs / MILLISECONDS_PER_HOUR)}h${
            Math.floor((remainingMs % MILLISECONDS_PER_HOUR) / (60 * 1000)) > 0
              ? ` ${Math.floor((remainingMs % MILLISECONDS_PER_HOUR) / (60 * 1000))}min`
              : ''
          }`;

    return {
      isPastDelivery: isExpired,
      daysPassed: 0,
      daysRemaining: 0,
      isExpired,
      countdownLabel: isExpired
        ? 'aguardando atualização'
        : `Devolvido automaticamente em ${timeRemainingLabel}`,
      deadline,
      hoursRemaining,
    };
  }

  const deliveryDate = parseOrderDeliveryDate(order);
  const defaultResult: FulfillmentCountdown = {
    isPastDelivery: false,
    daysPassed: 0,
    daysRemaining: maxDays,
    isExpired: false,
    countdownLabel: '',
    deadline: null,
    hoursRemaining: null,
  };
  if (!deliveryDate) return defaultResult;
  if (order.status !== 'scheduled' || getOrderType(order) !== 'sale') return defaultResult;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - deliveryDate.getTime();
  const diffDays = Math.floor(diffMs / MILLISECONDS_PER_DAY);

  if (diffDays < 0) return defaultResult;

  // Para pedidos de entrega, o prazo vence à meia-noite ao virar o dia agendado (e não ao fim do período da entrega)
  const isDelivery = isDeliveryOrder(order);
  const scheduledTime = isDelivery ? null : parseScheduleTime(order);
  const deadline = new Date(deliveryDate);
  if (scheduledTime) {
    deadline.setHours(scheduledTime.hours, scheduledTime.minutes, 0, 0);
  } else {
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(0, 0, 0, 0);
  }

  const remainingMs = deadline.getTime() - now.getTime();
  const isExpired = remainingMs <= 0;
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  const countdownLabel = isExpired
    ? 'aguardando atualização'
    : remainingMinutes < 60
      ? `${remainingMinutes}min`
      : `${Math.floor(remainingMinutes / 60)}h${remainingMinutes % 60 ? ` ${remainingMinutes % 60}min` : ''}`;

  return {
    isPastDelivery: true,
    daysPassed: diffDays,
    daysRemaining: 0,
    isExpired,
    countdownLabel,
    deadline,
    hoursRemaining: Math.max(0, Math.ceil(remainingMs / MILLISECONDS_PER_HOUR)),
  };
}
