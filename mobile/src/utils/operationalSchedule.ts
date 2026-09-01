const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const getOperationalScheduleDate = (order: any): string => {
  const data = order?.order_data || {};
  const shipping = data.shipping || order?.shipping || {};
  const scheduling = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};

  return scheduling.date
    || scheduling.startDate
    || data.scheduledDate
    || order?.scheduledDate
    || order?.scheduled_date
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
