import {
  isAssemblyOutsideType,
  isAssemblyInternalType,
  type AssemblyHandlingOption,
} from '../../utils/aiSummaryHelper';
import { getLocalDateString, isCancelledOrder, parseOrderDateStr } from '../../utils/orderUtils';

export type AssemblyTask = {
  id: string;
  order: any;
  item: any;
  dateKey: string;
  isOutside: boolean;
  scheduledTime?: string;
  responsibleName?: string;
};

const normalizeLabel = (value: unknown) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const getSchedule = (order: any) => {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  return shipping.scheduling || data.schedule || data.scheduling || order.schedule || {};
};

const getScheduleDate = (order: any): string => {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  const schedule = getSchedule(order);
  return parseOrderDateStr(
    schedule.date ||
      schedule.startDate ||
      order.scheduled_date ||
      order.date ||
      shipping.scheduledDate
  );
};

const getResponsibleName = (order: any, schedule: any): string | undefined => {
  const data = order.order_data || {};
  const responsibles = schedule.responsibles || data.assemblyResponsibles;
  if (Array.isArray(responsibles)) {
    const names = responsibles
      .map((responsible: any) => String(responsible?.name || responsible?.fullName || '').trim())
      .filter(Boolean);
    return names.length ? names.join(', ') : undefined;
  }
  return typeof responsibles === 'string' && responsibles.trim() ? responsibles.trim() : undefined;
};

export const getAssemblyTasks = (
  orders: any[],
  handlingOptions: AssemblyHandlingOption[] = []
): AssemblyTask[] => {
  const today = getLocalDateString(new Date());

  return orders.flatMap((order) => {
    const data = order.order_data || {};
    const shipping = data.shipping || {};
    const schedule = getSchedule(order);
    const dateKey = getScheduleDate(order);
    const status = String(order.status || data.status || '').toLowerCase();
    const hasPendingSchedule =
      schedule.pendingScheduling ||
      schedule.notInformed ||
      data.pendingScheduling ||
      order.pending_scheduling;

    if (
      data.deleted ||
      order.deleted ||
      isCancelledOrder(order) ||
      status === 'draft' ||
      status === 'rascunho'
    )
      return [];
    if (hasPendingSchedule || !dateKey || dateKey === 'sem_data' || dateKey < today) return [];

    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(order.items)
        ? order.items
        : [];
    const orderHandling = String(
      data.handlingType ||
        data.handling ||
        data.deliveryType ||
        shipping.handlingType ||
        shipping.handling ||
        order.handling ||
        order.handlingType ||
        ''
    );
    const scheduledTime = String(
      schedule.formattedTime || schedule.time || schedule.period || schedule.startTime || ''
    ).trim();
    const responsibleName = getResponsibleName(order, schedule);

    return items.flatMap((item: any, index: number) => {
      const handling = String(item.handlingType || item.handling || orderHandling);
      const isOutside = isAssemblyOutsideType(handling, handlingOptions);
      const isInternal = isAssemblyInternalType(handling, handlingOptions);
      if (!isOutside && !isInternal) return [];

      return [
        {
          id: `${order.id || order.orderIndex || 'order'}-${index}-${normalizeLabel(handling)}`,
          order,
          item,
          dateKey,
          isOutside,
          scheduledTime: scheduledTime || undefined,
          responsibleName,
        },
      ];
    });
  });
};
