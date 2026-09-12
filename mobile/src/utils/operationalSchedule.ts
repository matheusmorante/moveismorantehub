const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const getOperationalScheduleDate = (order: any): string => {
  // 1. Fonte de verdade primária: Coluna física normalizada no PostgreSQL
  const directDate = order?.scheduled_date || order?.scheduledDate;
  if (directDate) return String(directDate).substring(0, 10);

  // 2. Fallback temporário para registros legados no JSONB
  const data = order?.order_data || {};
  const shipping = data.shipping || order?.shipping || {};
  const scheduling = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};

  return scheduling.date
    || scheduling.startDate
    || scheduling.scheduledDate
    || scheduling.scheduled_date
    || data.scheduledDate
    || data.scheduled_date
    || data.date
    || order?.date
    || '';
};

export const isScheduledAssistanceOrReturn = (order: any): boolean => {
  const data = order?.order_data || {};
  const type = normalize(order?.order_type || data.orderType || order?.orderType);
  const rawStatus = normalize(order?.status || data.status);
  const status = rawStatus === 'agendado' ? 'scheduled' : rawStatus;

  return ['assistance', 'return'].includes(type)
    && status === 'scheduled'
    && Boolean(getOperationalScheduleDate(order));
};
