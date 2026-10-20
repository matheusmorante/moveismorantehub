import {
  normalizeScheduleDate,
  resolveEffectiveSchedule,
} from '../../../../shared-utils/commercialOrderRules';

const normalize = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const normalizeScheduleStatus = (order: any): string => {
  const data = order?.order_data || {};
  const status = normalize(order?.status || data.status);
  if (status === 'agendado') return 'scheduled';
  if (status === 'rascunho') return 'draft';
  return status;
};

export const getOperationalScheduleDate = (order: any, referenceDate: Date = new Date()): string => {
  // 1. Resolve a programação efetiva (avança para a próxima alternativa se a data definida passou)
  const resolved = resolveEffectiveSchedule(order, referenceDate);
  if (resolved.effective?.date) {
    return resolved.effective.date;
  }

  // 2. Coluna física normalizada no PostgreSQL como fallback
  const directDate = order?.scheduled_date || order?.scheduledDate;
  if (directDate) return normalizeScheduleDate(String(directDate));

  // 3. Fallback para campos brutos legados
  const data = order?.order_data || {};
  const shipping = order?.shipping || data.shipping || {};
  const scheduling =
    shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};

  const fallback =
    scheduling.date ||
    scheduling.startDate ||
    order?.scheduledDate ||
    data.scheduledDate ||
    order?.scheduled_date ||
    '';

  return normalizeScheduleDate(fallback);
};

export const isScheduledAssistanceOrReturn = (order: any): boolean => {
  const data = order?.order_data || {};
  const type = normalize(order?.orderType || data.orderType || order?.order_type);
  return (
    ['assistance', 'return'].includes(type) &&
    normalizeScheduleStatus(order) === 'scheduled' &&
    Boolean(getOperationalScheduleDate(order))
  );
};
