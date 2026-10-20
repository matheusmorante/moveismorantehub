import {
  normalizeScheduleDate,
  resolveEffectiveSchedule,
} from '../../../shared-utils/commercialOrderRules';

const normalize = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const getOperationalScheduleDate = (order: any, referenceDate: Date = new Date()): string => {
  // 1. Resolve a programação efetiva (se a data definida já passou, avança para a próxima alternativa válida)
  const resolved = resolveEffectiveSchedule(order, referenceDate);
  if (resolved.effective?.date) {
    return resolved.effective.date;
  }

  // 2. Coluna física normalizada no PostgreSQL como fallback
  const directDate = order?.scheduled_date || order?.scheduledDate;
  if (directDate) return normalizeScheduleDate(String(directDate));

  // 3. Fallback para campos brutos legados
  const data = order?.order_data || {};
  const shipping = data.shipping || order?.shipping || {};
  const scheduling =
    shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};

  const fallback =
    scheduling.date ||
    scheduling.startDate ||
    scheduling.scheduledDate ||
    scheduling.scheduled_date ||
    data.scheduledDate ||
    data.scheduled_date ||
    data.date ||
    order?.date ||
    '';

  return normalizeScheduleDate(fallback);
};

export const isScheduledAssistanceOrReturn = (order: any): boolean => {
  const data = order?.order_data || {};
  const type = normalize(order?.order_type || data.orderType || order?.orderType);
  const rawStatus = normalize(order?.status || data.status);
  const status = rawStatus === 'agendado' ? 'scheduled' : rawStatus;

  return (
    ['assistance', 'return'].includes(type) &&
    status === 'scheduled' &&
    Boolean(getOperationalScheduleDate(order))
  );
};
